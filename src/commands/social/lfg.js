const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const LFGRepository = require('../../database/LFGRepository');
const embedBuilder  = require('../../utils/embedBuilder');

function lfgEmbed(post, client) {
  const spots = post.slots - post.players.length;
  const players = post.players.map(id => `<@${id}>`).join(', ') || '_Aucun_';
  return embedBuilder.base(post.closed ? 0x95a5a6 : 0x2ecc71)
    .setTitle(`🎮 LFG — ${post.game}`)
    .setDescription(post.description || '_Pas de description_')
    .addFields(
      { name: '👥 Joueurs',      value: players,                           inline: false },
      { name: '🎯 Places',       value: `${spots} restante${spots>1?'s':''}`, inline: true },
      { name: '⏱ Expire',        value: `<t:${Math.floor(post.expiresAt/1000)}:R>`, inline: true },
      { name: '📌 Statut',       value: post.closed ? '🔒 Complet/Fermé' : '🟢 Ouvert',  inline: true },
    )
    .setFooter({ text: `ID : ${post._id}` });
}

function lfgRow(postId, closed) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lfg_join_${postId}`)
      .setLabel('Rejoindre')
      .setStyle(ButtonStyle.Success)
      .setDisabled(closed),
    new ButtonBuilder()
      .setCustomId(`lfg_close_${postId}`)
      .setLabel('Fermer')
      .setStyle(ButtonStyle.Danger),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lfg')
    .setDescription('Looking For Group — trouve des coéquipiers')
    .addSubcommand(s => s.setName('creer')
      .setDescription('Crée une annonce LFG')
      .addStringOption(o => o.setName('jeu').setDescription('Nom du jeu').setRequired(true).setMaxLength(50))
      .addStringOption(o => o.setName('description').setDescription('Détails (mode, rank, etc.)').setRequired(false).setMaxLength(200))
      .addIntegerOption(o => o.setName('joueurs').setDescription('Nombre de places (défaut 4)').setMinValue(2).setMaxValue(20).setRequired(false))
      .addIntegerOption(o => o.setName('duree').setDescription('Durée en heures (défaut 3h, max 24h)').setMinValue(1).setMaxValue(24).setRequired(false))
    )
    .addSubcommand(s => s.setName('liste')
      .setDescription('Voir les annonces LFG actives')
      .addStringOption(o => o.setName('jeu').setDescription('Filtrer par jeu').setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'creer') {
      await interaction.deferReply();

      // Un seul LFG actif par personne
      const existing = await LFGRepository.getUserActive(interaction.user.id);
      if (existing) {
        return interaction.editReply({ embeds: [embedBuilder.error('LFG existant', 'Tu as déjà un LFG ouvert. Ferme-le d\'abord avec le bouton 🔴.')] });
      }

      const game    = interaction.options.getString('jeu');
      const desc    = interaction.options.getString('description') || '';
      const slots   = interaction.options.getInteger('joueurs') ?? 4;
      const dureeh  = interaction.options.getInteger('duree') ?? 3;

      const post = await LFGRepository.create(interaction.user.id, game, desc, slots, dureeh);
      const embed = lfgEmbed(post);
      const row   = lfgRow(post._id.toString(), false);

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      await LFGRepository.setMessage(post._id, msg.id, interaction.channelId);
    }

    if (sub === 'liste') {
      await interaction.deferReply();
      const game  = interaction.options.getString('jeu');
      const posts = await LFGRepository.getActive(game);

      if (!posts.length) {
        return interaction.editReply({ embeds: [embedBuilder.error('Aucun LFG', 'Pas d\'annonce active en ce moment. Crée la tienne avec `/lfg creer` !')] });
      }

      const lines = posts.map(p => {
        const spots = p.slots - p.players.length;
        return `🎮 **${p.game}** — ${spots} place${spots>1?'s':''} · <@${p.discordId}> · \`${p._id}\`\n${p.description ? `> ${p.description}` : ''}`;
      });

      return interaction.editReply({
        embeds: [embedBuilder.base(0x2ecc71)
          .setTitle('📋 Annonces LFG actives')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: 'Clique sur le bouton Rejoindre dans l\'annonce pour rejoindre' })],
      });
    }
  },

  // Handler boutons (appelé depuis interactionCreate)
  async handleButton(interaction) {
    const [, action, postId] = interaction.customId.split('_');

    if (action === 'join') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await LFGRepository.join(postId, interaction.user.id);
      if (result?.error === 'already_in') return interaction.editReply({ embeds: [embedBuilder.error('LFG', 'Tu es déjà dans ce groupe.')] });
      if (result?.error === 'full')       return interaction.editReply({ embeds: [embedBuilder.error('LFG', 'Le groupe est complet.')] });
      if (result?.error === 'closed')     return interaction.editReply({ embeds: [embedBuilder.error('LFG', 'Ce LFG est fermé.')] });

      // Mettre à jour le message original
      try {
        const embed = lfgEmbed(result.post);
        const row   = lfgRow(postId, result.full);
        await interaction.message.edit({ embeds: [embed], components: [row] });
      } catch {}

      return interaction.editReply({ embeds: [embedBuilder.success('Rejoint !', `Tu as rejoint le LFG **${result.post.game}** !`)] });
    }

    if (action === 'close') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const post = await LFGRepository.getUserActive(interaction.user.id);
      if (!post || post._id.toString() !== postId) {
        return interaction.editReply({ embeds: [embedBuilder.error('LFG', 'Tu n\'es pas le créateur de ce LFG.')] });
      }
      await LFGRepository.closeMany([postId]);
      try {
        const updatedPost = { ...post.toObject(), closed: true };
        await interaction.message.edit({ embeds: [lfgEmbed(updatedPost)], components: [lfgRow(postId, true)] });
      } catch {}
      return interaction.editReply({ embeds: [embedBuilder.success('LFG fermé', 'Ton annonce LFG a été fermée.')] });
    }
  },
};
