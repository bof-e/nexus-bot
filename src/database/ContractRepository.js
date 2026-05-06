const ClanContract = require('./models/ClanContract');

class ContractRepository {
  async create(clanId, clanName, clanTag, reward, xpTarget, durationH) {
    return ClanContract.create({
      clanId, clanName, clanTag,
      reward, xpTarget,
      duration:  durationH * 3600_000,
      expiresAt: Date.now() + durationH * 3600_000,
    });
  }

  async getOpen(limit = 8) {
    return ClanContract.find({
      completed: false, cancelled: false,
      expiresAt: { $gt: Date.now() },
    }).sort({ createdAt: -1 }).limit(limit);
  }

  async enlist(contractId, discordId) {
    const c = await ClanContract.findById(contractId);
    if (!c || c.completed || c.cancelled) return { error: 'unavailable' };
    if (c.mercenaries.includes(discordId))  return { error: 'already_enlisted' };
    if (c.clanId === discordId)             return { error: 'own_clan' };
    c.mercenaries.push(discordId);
    await c.save();
    return { contract: c };
  }

  /** Ajoute de l'XP généré par un mercenaire et complète si objectif atteint. */
  async contributeXP(contractId, xp) {
    const c = await ClanContract.findById(contractId);
    if (!c || c.completed || c.cancelled) return null;
    c.xpGenerated += xp;
    if (c.xpGenerated >= c.xpTarget) c.completed = true;
    await c.save();
    return c;
  }

  async getByMercenary(discordId) {
    return ClanContract.find({
      mercenaries: discordId,
      completed: false, cancelled: false,
      expiresAt: { $gt: Date.now() },
    });
  }

  async getExpired() {
    return ClanContract.find({ completed: false, cancelled: false, expiresAt: { $lte: Date.now() } });
  }

  async cancel(contractId) {
    return ClanContract.findByIdAndUpdate(contractId, { cancelled: true });
  }
}

module.exports = new ContractRepository();
