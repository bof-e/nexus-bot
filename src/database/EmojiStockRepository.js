const EmojiStock    = require('./models/EmojiStock');
const EmojiPosition = require('./models/EmojiPosition');

// Prix min/max pour éviter les dérives totales
const PRICE_MIN  = 10;
const PRICE_MAX  = 10000;
const BASE_PRICE = 100;

class EmojiStockRepository {

  /** Enregistre un usage d'emoji et recalcule le prix. */
  async recordUsage(emojiId, emojiName, count = 1) {
    const stock = await EmojiStock.findOneAndUpdate(
      { emojiId },
      {
        $setOnInsert: { name: emojiName, price: BASE_PRICE, supply: 1000 },
        $inc: { usageCount: count, usageTotal: count },
        $set: { updatedAt: new Date(), name: emojiName },
      },
      { upsert: true, new: true }
    );
    await this._recalcPrice(stock);
  }

  /** Recalcule le prix selon l'usage des 24h : plus utilisé = moins cher (inflation). */
  async _recalcPrice(stock) {
    // Formule : chaque usage baisse le prix de 2%, chaque heure sans usage le monte de 1%
    // Variation basée sur usageCount (depuis le dernier reset cron)
    const usageFactor = Math.max(0.5, 1 - (stock.usageCount * 0.02));
    let newPrice = Math.round(stock.price * usageFactor);
    newPrice = Math.max(PRICE_MIN, Math.min(PRICE_MAX, newPrice));

    const history = [...(stock.history || []), stock.price].slice(-24);
    await EmojiStock.updateOne({ emojiId: stock.emojiId }, { price: newPrice, history });
  }

  /** Reset des usages 24h + remontée naturelle des prix (appelé par cron). */
  async dailyReset() {
    const stocks = await EmojiStock.find();
    for (const s of stocks) {
      // Sans usage, le prix remonte doucement vers la base
      const recovery = Math.round(s.price * 1.05);
      const newPrice = Math.min(PRICE_MAX, Math.max(s.price, recovery));
      const history  = [...(s.history || []), s.price].slice(-24);
      await EmojiStock.updateOne(
        { emojiId: s.emojiId },
        { usageCount: 0, price: newPrice, history }
      );
    }
    return stocks.length;
  }

  /** Achat de parts. Retourne { success, cost, newBalance }. */
  async buy(discordId, emojiId, shares, UserRepository) {
    const stock = await EmojiStock.findOne({ emojiId });
    if (!stock) return { success: false, error: 'emoji_unknown' };

    const cost   = stock.price * shares;
    const result = await UserRepository.spendCoins(discordId, cost);
    if (!result.success) return { success: false, error: 'insufficient_coins', balance: result.balance, cost };

    const pos = await EmojiPosition.findOneAndUpdate(
      { discordId, emojiId },
      { $setOnInsert: { shares: 0, avgPrice: 0 } },
      { upsert: true, new: true }
    );
    const totalShares   = pos.shares + shares;
    const newAvgPrice   = ((pos.shares * pos.avgPrice) + cost) / totalShares;
    await EmojiPosition.updateOne({ discordId, emojiId }, { shares: totalShares, avgPrice: Math.round(newAvgPrice) });

    return { success: true, cost, newBalance: result.balance, price: stock.price };
  }

  /** Vente de parts. Retourne { success, gained }. */
  async sell(discordId, emojiId, shares, UserRepository) {
    const [stock, pos] = await Promise.all([
      EmojiStock.findOne({ emojiId }),
      EmojiPosition.findOne({ discordId, emojiId }),
    ]);
    if (!stock) return { success: false, error: 'emoji_unknown' };
    if (!pos || pos.shares < shares) return { success: false, error: 'insufficient_shares', owned: pos?.shares ?? 0 };

    const gained   = stock.price * shares;
    const newShares = pos.shares - shares;
    await EmojiPosition.updateOne({ discordId, emojiId }, { shares: newShares });
    await UserRepository.addCoins(discordId, gained);

    return { success: true, gained, price: stock.price, profit: gained - (pos.avgPrice * shares) };
  }

  async getStock(emojiId)    { return EmojiStock.findOne({ emojiId }); }
  async getTopStocks(n = 10) { return EmojiStock.find().sort({ price: -1 }).limit(n); }
  async getPortfolio(discordId) {
    const positions = await EmojiPosition.find({ discordId, shares: { $gt: 0 } });
    const result = [];
    for (const pos of positions) {
      const stock = await EmojiStock.findOne({ emojiId: pos.emojiId });
      if (!stock) continue;
      const value  = stock.price * pos.shares;
      const profit = value - (pos.avgPrice * pos.shares);
      result.push({ ...pos.toObject(), stock, value, profit });
    }
    return result.sort((a, b) => b.value - a.value);
  }
}

module.exports = new EmojiStockRepository();
