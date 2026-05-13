const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ContractRepository = require('../../database/ContractRepository');
const ClanRepository     = require('../../database/ClanRepository');
const UserRepository     = require('../../database/UserRepository');
const embedBuilder       = require('../../utils/embedBuilder');

function contractEmbed(c) {
  const pct  = Math.min(100, Math.round((c.xpGenerated / c.xpTarget) * 100));
  const bar  = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
  return embedBuilder.base(c.completed ? 0x2ecc71 : 0xE67E22)
    .setTitle('📜 Contrat [' + c.clanTag + '] ' + c.clanName)
    .addFields(
      { name: '💰 Récompense',   value: '**' + c.reward + ' 🪙**',                               inline: true },
      { name: '🎯 Objectif XP',  value: '**' + c.xpGenerated + ' / ' + c.xpTarget + ' XP**',    inline: true },
      { name: '⏱ Expire',        value: '<t:' + Math.floor(c.expiresAt / 1000) + ':R>',          inline: true },
      { name: '📊 Progression',  value: '`[' + bar + ']` ' + pct + '%',                          inline: false },
      { name: '⚔️ Mercenaires',  value: c.mercenaries.length ? c.mercenaries.map(id => '<@' + id + '>').join(', ') : '_Aucun encore_', inline: false },
    )
    .setFooter({ text: 'ID : ' + c._id });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mercenaire')
    .setDescription('⚔️ Contrats de clan — deviens mercenaire ou embauche des soldats')
    .addSubcommand(s => s.setName('contrats').setDescription('Voir les contrats ouverts'))
    .addSubcommand(s => s.setName('rejoindre')
      .setDescription('Rejoindre un contrat comme mercenaire')
      .addStringOption(o => o.setName('id').setDescription('ID du contrat').setRequired(true))
    )
    .addSubcommand(s => s.setName('poster')
      .setDescription('Poster un contrat (chef de clan uniquement)')
      .addIntegerOption(o => o.setName('recompense').setDescription('Coins offerts aux mercenaires').setRequired(true).setMinValue(50).setMaxValue(50000))
      .addIntegerOption(o => o.setName('xp_cible').setDescription('XP total à générer').setRequired(true).setMinValue(500).setMaxValue(100000))
      .addIntegerOption(o => o.setName('duree').setDescription('Durée en heures (1-48)').setRequired(true).setMinValue(1).setMaxValue(48))
    )
    .addSubcommand(s => s.setName('mes_contrats').setDescription('Tes contrats actifs en tant que mercenaire')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'contrats') {
      await interaction.deferReply();
      const contracts = await ContractRepository.getOpen();
      if (!contracts.length) return interaction.editReply({ embeds: [embedBuilder.error('Mercenaires', 'Aucun contrat ouvert. Un chef de clan peut en poster un avec `/mercenaire poster`.')] });
      return interaction.editReply({ embeds: contracts.slice(0, 3).map(contractEmbed) });
    }

    if (sub === 'rejoindre') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const id     = interaction.options.getString('id');
      const result = await ContractRepository.enlist(id, interaction.user.id);
       if (result?.error === 'unavailable')     return interaction.editReply({ embeds: [embedBuilder.error('Contrat', 'Contrat indisponible ou expiré.')] });
      if (result?.error === 'already_enlisted') return interaction.editReply({ embeds: [embedBuilder.error('Contrat', 'Tu es déjà enrôlé dans ce contrat.')] });
      // BUG FIX: gérer l'erreur own_clan (un chef ne peut pas être mercenaire de son propre clan)
      if (result?.error === 'own_clan')         return interaction.editReply({ embeds: [embedBuilder.error('Contrat', 'Tu ne peux pas être mercenaire pour ton propre clan.')] });
      return interaction.editReply({ embeds: [embedBuilder.success('Enrôlé !', 'Tu es maintenant mercenaire pour **[' + result.contract.clanTag + '] ' + result.contract.clanName + '**.\nChaque XP que tu génères sur le serveur compte pour l\'objectif du contrat !')] });
    }

    if (sub === 'poster') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const clan = await ClanRepository.findByMember(interaction.user.id);
      if (!clan)                                return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Tu n\'as pas de clan.')] });
      if (clan.ownerId !== interaction.user.id) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Seul le chef de clan peut poster un contrat.')] });

      const reward   = interaction.options.getInteger('recompense');
      const xpTarget = interaction.options.getInteger('xp_cible');
      const duree    = interaction.options.getInteger('duree');

      // Débiter les coins du clan owner
      const result = await UserRepository.spendCoins(interaction.user.id, reward);
      if (!result.success) return interaction.editReply({ embeds: [embedBuilder.error('Fonds insuffisants', 'Il te faut **' + reward + ' 🪙** pour poster ce contrat. Tu en as **' + result.balance + '**.')] });

      const contract = await ContractRepository.create(clan._id.toString(), clan.name, clan.tag, reward, xpTarget, duree);
      return interaction.editReply({ embeds: [embedBuilder.success('Contrat posté !', '**' + reward + ' 🪙** mis en jeu pour **' + xpTarget + ' XP** en **' + duree + 'h**.\nLes mercenaires peuvent le rejoindre avec `/mercenaire rejoindre ' + contract._id + '`')] });
    }

    if (sub === 'mes_contrats') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const contracts = await ContractRepository.getByMercenary(interaction.user.id);
      if (!contracts.length) return interaction.editReply({ embeds: [embedBuilder.error('Mercenaire', 'Tu n\'as aucun contrat actif. `/mercenaire contrats` pour voir les offres.')] });
      return interaction.editReply({ embeds: contracts.slice(0, 3).map(contractEmbed) });
    }
  },
};
