const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const SuggestionRepository = require('../../database/SuggestionRepository');
const UserRepository       = require('../../database/UserRepository');
const embedBuilder         = require('../../utils/embedBuilder');
const config               = require('../../../config');

function suggEmbed(s) {
  const score = s.upvotes.length - s.downvotes.length;
  const statusColor = { pending: 0xF5A623, approved: 0x2ecc71, rejected: 0xe74c3c }[s.status];
  const statusLabel = { pending: '⏳ En attente', approved: '✅ Approuvée', rejected: '❌ Rejetée' }[s.status];
  return embedBuilder.base(statusColor)
    .setTitle('💡 Suggestion')
    .setDescription(s.content)
    .addFields(
      { name: 'Statut',   value: statusLabel, inline: true },
      { name: 'Score',    value: `👍 ${s.upvotes.length} · 👎 ${s.downvotes.length} · **${score > 0 ? '+' : ''}${score}**`, inline: true },
      { name: 'Auteur',   value: `<@${s.discordId}>`, inline: true },
      ...(s.adminNote ? [{ name: '📝 Note admin', value: s.adminNote }] : []),
    )
    .setFooter({ text: `ID : ${s._id}` })
    .setTimestamp(s.createdAt);
}

function suggRow(id, status) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sugg_up_${id}`).setLabel('👍').setStyle(ButtonStyle.Success).setDisabled(status !== 'pending'),
    new ButtonBuilder().setCustomId(`sugg_down_${id}`).setLabel('👎').setStyle(ButtonStyle.Danger).setDisabled(status !== 'pending'),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Système de suggestions communautaires')
    .addSubcommand(s => s.setName('ajouter')
      .setDescription('Soumettre une suggestion')
      .addStringOption(o => o.setName('idee').setDescription('Ta suggestion').setRequired(true).setMaxLength(500))
    )
    .addSubcommand(s => s.setName('liste').setDescription('Voir les dernières suggestions'))
    .addSubcommand(s => s.setName('traiter')
      .setDescription('Approuver ou rejeter une suggestion (Admin)')
      // ✅ setDefaultMemberPermissions retiré du subcommand (méthode inexistante ici)
      .addStringOption(o => o.setName('id').setDescription('ID de la suggestion').setRequired(true))
      .addStringOption(o => o.setName('decision').setDescription('Décision').setRequired(true)
        .addChoices({ name: '✅ Approuver', value: 'approved' }, { name: '❌ Rejeter', value: 'rejected' }))
      .addStringOption(o => o.setName('note').setDescription('Note explicative').setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'ajouter') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const content = interaction.options.getString('idee');
      const sugg    = await SuggestionRepository.create(interaction.user.id, content);
      const channelId = await UserRepository.getSetting('suggestions_channel') || config.channels.updates;
      if (channelId) {
        try {
          const ch = await interaction.client.channels.fetch(channelId).catch(() => null);
          if (ch?.isTextBased()) {
            const msg = await ch.send({ embeds: [suggEmbed(sugg)], components: [suggRow(sugg._id.toString(), 'pending')] });
            await SuggestionRepository.setMessage(sugg._id, msg.id, channelId);
          }
        } catch {}
      }
      return interaction.editReply({ embeds: [embedBuilder.success('Suggestion envoyée !', 'Ta suggestion a été soumise à la communauté. Merci !')] });
    }

    if (sub === 'liste') {
      await interaction.deferReply();
      const suggestions = await SuggestionRepository.getRecent(8);
      if (!suggestions.length) {
        return interaction.editReply({ embeds: [embedBuilder.error('Aucune suggestion', 'Pas encore de suggestion. Sois le premier avec `/suggestion ajouter` !')] });
      }
      const lines = suggestions.map(s => {
        const score  = s.upvotes.length - s.downvotes.length;
        const status = { pending: '⏳', approved: '✅', rejected: '❌' }[s.status];
        return `${status} **${s.content.slice(0, 60)}${s.content.length > 60 ? '…' : ''}**\n┗ <@${s.discordId}> · 👍${s.upvotes.length} 👎${s.downvotes.length} · score **${score > 0 ? '+' : ''}${score}**`;
      });
      return interaction.editReply({
        embeds: [embedBuilder.base(0xF5A623).setTitle('💡 Suggestions récentes').setDescription(lines.join('\n\n'))],
      });
    }

    if (sub === 'traiter') {
      // ✅ Vérification manuelle de la permission
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          embeds: [embedBuilder.error('Permission refusée', '🔒 Tu dois avoir la permission **Gérer le serveur** pour traiter une suggestion.')],
          flags: MessageFlags.Ephemeral,
        });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const id       = interaction.options.getString('id');
      const decision = interaction.options.getString('decision');
      const note     = interaction.options.getString('note') || '';
      const sugg = await SuggestionRepository.setStatus(id, decision, note);
      if (!sugg) return interaction.editReply({ embeds: [embedBuilder.error('Introuvable', 'Suggestion non trouvée.')] });
      if (sugg.messageId && sugg.channelId) {
        try {
          const ch  = await interaction.client.channels.fetch(sugg.channelId).catch(() => null);
          const msg = await ch?.messages.fetch(sugg.messageId).catch(() => null);
          if (msg) await msg.edit({ embeds: [suggEmbed(sugg)], components: [suggRow(id, decision)] });
        } catch {}
      }
      return interaction.editReply({
        embeds: [embedBuilder.success('Traité', `Suggestion **${decision === 'approved' ? 'approuvée ✅' : 'rejetée ❌'}**`)],
      });
    }
  },

  async handleButton(interaction) {
    const [, action, id] = interaction.customId.split('_');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sugg = await SuggestionRepository.vote(id, interaction.user.id, action === 'up' ? 'up' : 'down');
    if (!sugg) return interaction.editReply({ embeds: [embedBuilder.error('Erreur', 'Suggestion introuvable.')] });
    try { await interaction.message.edit({ embeds: [suggEmbed(sugg)], components: [suggRow(id, sugg.status)] }); } catch {}
    return interaction.editReply({ content: action === 'up' ? '👍 Vote enregistré !' : '👎 Vote enregistré !', embeds: [] });
  },
};