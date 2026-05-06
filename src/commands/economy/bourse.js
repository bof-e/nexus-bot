const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const EmojiStockRepository = require('../../database/EmojiStockRepository');
const UserRepository       = require('../../database/UserRepository');
const embedBuilder         = require('../../utils/embedBuilder');

function priceArrow(history, current) {
  if (!history?.length) return '➡️';
  const prev = history[history.length - 1];
  return current > prev ? '📈' : current < prev ? '📉' : '➡️';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bourse')
    .setDescription('🎰 La Bourse aux Emojis — spécule, investis, ruine l\'économie')
    .addSubcommand(s => s.setName('marche').setDescription('Voir les emojis les plus valorisés du moment'))
    .addSubcommand(s => s.setName('portefeuille').setDescription('Ton portefeuille d\'emojis'))
    .addSubcommand(s => s.setName('acheter')
      .setDescription('Acheter des parts d\'un emoji')
      .addStringOption(o => o.setName('emoji').setDescription('L\'emoji ciblé').setRequired(true))
      .addIntegerOption(o => o.setName('parts').setDescription('Nombre de parts (défaut 1)').setMinValue(1).setMaxValue(100).setRequired(false))
    )
    .addSubcommand(s => s.setName('vendre')
      .setDescription('Revendre des parts d\'un emoji')
      .addStringOption(o => o.setName('emoji').setDescription('L\'emoji ciblé').setRequired(true))
      .addIntegerOption(o => o.setName('parts').setDescription('Nombre de parts').setMinValue(1).setRequired(false))
    )
    .addSubcommand(s => s.setName('cours')
      .setDescription('Cours détaillé d\'un emoji')
      .addStringOption(o => o.setName('emoji').setDescription('L\'emoji ciblé').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'marche') {
      await interaction.deferReply();
      const stocks = await EmojiStockRepository.getTopStocks(10);
      if (!stocks.length) return interaction.editReply({ embeds: [embedBuilder.error('Bourse', 'Aucun emoji coté. Utilisez des emojis pour les faire apparaître !')] });
      const lines = stocks.map((s, i) => {
        const arrow = priceArrow(s.history, s.price);
        return `**${i + 1}.** ${s.name} ${arrow} — 🪙 **${s.price}**/part · 📊 ${s.usageCount} usages/24h`;
      });
      return interaction.editReply({
        embeds: [embedBuilder.base(0xF1C40F)
          .setTitle('📈 Bourse aux Emojis — Marché en direct')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Plus un emoji est spammé, moins il vaut. La rareté c\'est le pouvoir.' })
          .setTimestamp()],
      });
    }

    if (sub === 'portefeuille') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const portfolio = await EmojiStockRepository.getPortfolio(interaction.user.id);
      const user      = await UserRepository.findOrCreate(interaction.user.id, interaction.user.username);
      if (!portfolio.length) return interaction.editReply({ embeds: [embedBuilder.error('Portefeuille', 'Aucune position ouverte. `/bourse acheter` pour commencer !')] });
      const totalValue  = portfolio.reduce((s, p) => s + p.value, 0);
      const totalProfit = portfolio.reduce((s, p) => s + p.profit, 0);
      const lines = portfolio.map(p => {
        const arrow  = priceArrow(p.stock.history, p.stock.price);
        const profit = p.profit >= 0 ? '+' + p.profit : String(p.profit);
        return `${p.stock.name} ${arrow} — **${p.shares} parts** · **${p.stock.price}🪙**/part · PnL: **${profit}🪙**`;
      });
      return interaction.editReply({
        embeds: [embedBuilder.base(totalProfit >= 0 ? 0x2ecc71 : 0xe74c3c)
          .setTitle('💼 Portefeuille — ' + interaction.user.username)
          .setDescription(lines.join('\n'))
          .addFields(
            { name: '💰 Solde',       value: '**' + (user.coins ?? 0) + ' 🪙**', inline: true },
            { name: '📊 Valeur',      value: '**' + totalValue + ' 🪙**',         inline: true },
            { name: '📈 PnL total',   value: '**' + (totalProfit >= 0 ? '+' : '') + totalProfit + ' 🪙**', inline: true },
          )],
      });
    }

    if (sub === 'acheter') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const raw    = interaction.options.getString('emoji');
      const shares = interaction.options.getInteger('parts') ?? 1;
      const customMatch = raw.match(/<a?:(\w+):(\d+)>/);
      const emojiId   = customMatch ? customMatch[2] : raw;
      const emojiName = customMatch ? customMatch[1] : raw;
      const stock = await EmojiStockRepository.getStock(emojiId);
      if (!stock) return interaction.editReply({ embeds: [embedBuilder.error('Bourse', emojiName + ' n\'est pas encore coté. Il doit d\'abord être utilisé dans le serveur !')] });
      const result = await EmojiStockRepository.buy(interaction.user.id, emojiId, shares, UserRepository);
      if (!result.success && result.error === 'insufficient_coins') {
        return interaction.editReply({ embeds: [embedBuilder.error('Fonds insuffisants', 'Il te faut **' + result.cost + ' 🪙** pour ' + shares + ' part(s). Tu en as **' + result.balance + '**.')] });
      }
      return interaction.editReply({ embeds: [embedBuilder.success('Achat effectué !', shares + ' part(s) de ' + stock.name + ' à **' + stock.price + ' 🪙/part**\n💸 Coût : **' + result.cost + ' 🪙** · Solde restant : **' + result.newBalance + ' 🪙**')] });
    }

    if (sub === 'vendre') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const raw = interaction.options.getString('emoji');
      const customMatch = raw.match(/<a?:(\w+):(\d+)>/);
      const emojiId = customMatch ? customMatch[2] : raw;
      let shares    = interaction.options.getInteger('parts');
      if (!shares) {
        const pos = await require('../../database/models/EmojiPosition').findOne({ discordId: interaction.user.id, emojiId });
        shares = pos?.shares ?? 0;
      }
      if (!shares) return interaction.editReply({ embeds: [embedBuilder.error('Bourse', 'Tu n\'as aucune part de cet emoji.')] });
      const result = await EmojiStockRepository.sell(interaction.user.id, emojiId, shares, UserRepository);
      if (!result.success) {
        if (result.error === 'insufficient_shares') return interaction.editReply({ embeds: [embedBuilder.error('Bourse', 'Tu n\'as que **' + result.owned + ' part(s)**.')] });
        return interaction.editReply({ embeds: [embedBuilder.error('Bourse', 'Emoji introuvable.')] });
      }
      const sign = result.profit >= 0 ? '+' : '';
      return interaction.editReply({ embeds: [embedBuilder.base(result.profit >= 0 ? 0x2ecc71 : 0xe74c3c).setTitle('💰 Vente effectuée !').setDescription(shares + ' part(s) à **' + result.price + ' 🪙/part**\n💵 Gains : **' + result.gained + ' 🪙** · PnL : **' + sign + result.profit + ' 🪙**')] });
    }

    if (sub === 'cours') {
      await interaction.deferReply();
      const raw = interaction.options.getString('emoji');
      const customMatch = raw.match(/<a?:(\w+):(\d+)>/);
      const emojiId = customMatch ? customMatch[2] : raw;
      const stock = await EmojiStockRepository.getStock(emojiId);
      if (!stock) return interaction.editReply({ embeds: [embedBuilder.error('Bourse', 'Cet emoji n\'est pas encore coté.')] });
      const arrow = priceArrow(stock.history, stock.price);
      const bars  = ['▁','▂','▃','▄','▅','▆','▇','█'];
      const hist  = stock.history.slice(-12);
      const max   = Math.max(...hist, stock.price);
      const min   = Math.min(...hist, stock.price);
      const sparkline = hist.map(p => bars[Math.round(((p - min) / (max - min || 1)) * (bars.length - 1))]).join('');
      return interaction.editReply({ embeds: [embedBuilder.base(0xF1C40F).setTitle(arrow + ' Cours — ' + stock.name)
        .addFields(
          { name: '💰 Prix actuel',  value: '**' + stock.price + ' 🪙**',  inline: true },
          { name: '📊 Usages/24h',   value: '**' + stock.usageCount + '**', inline: true },
          { name: '📈 Total usages', value: '**' + stock.usageTotal + '**', inline: true },
          { name: '📉 Historique',   value: '`' + (sparkline || '—') + '`', inline: false },
        ).setFooter({ text: 'Prix monte quand l\'emoji est rare, baisse quand il est spammé.' })] });
    }
  },
};
