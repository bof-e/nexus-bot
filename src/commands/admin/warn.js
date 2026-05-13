const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const WarnRepository = require('../../database/WarnRepository');
const embedBuilder   = require('../../utils/embedBuilder');
const logger         = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Système d\'avertissements progressifs (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Ajouter un avertissement à un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Raison').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Voir les avertissements d\'un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Effacer tous les avertissements d\'un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getUser('membre');

    if (target?.bot) {
      return interaction.editReply({ embeds: [embedBuilder.error('Action impossible', 'Tu ne peux pas avertir un bot.')] });
    }

    // ── /warn add ────────────────────────────────────────────────────────────
    if (sub === 'add') {
      const raison = interaction.options.getString('raison') || 'Aucune raison spécifiée';
      const { count, sanction } = await WarnRepository.add(
        target.id, interaction.guild.id, raison, interaction.user.id
      );

      // BUG FIX: .tag est déprécié dans discord.js v14, utiliser .username
      logger.info(`[Warn] ${interaction.user.username} → ${target.username} (${count} warns) : ${raison}`);

      // Appliquer le mute Discord si sanction automatique
      if (sanction?.action === 'mute') {
        try {
          const member = await interaction.guild.members.fetch(target.id);
          await member.timeout(sanction.duration, `Auto-mute : ${count} avertissements`);
        } catch (e) {
          logger.warn(`[Warn] Impossible d'appliquer le mute Discord : ${e.message}`);
        }
      }

      const sanctionText = sanction
        ? `\n⚠️ **Sanction automatique déclenchée : ${sanction.label}**`
        : '';

      const embed = embedBuilder.base(0xFFA500)
        .setTitle('⚠️ Avertissement ajouté')
        .setDescription(
          `<@${target.id}> a reçu un avertissement.\n`
          + `📌 Raison : *${raison}*\n`
          + `🔢 Total : **${count} warn${count > 1 ? 's' : ''}**`
          + sanctionText
        )
        .addFields({
          name: 'Seuils automatiques',
          value: Object.entries(WarnRepository.getThresholds())
            .map(([n, s]) => `**${n} warns** → ${s.label}`)
            .join('\n'),
          inline: true,
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /warn list ───────────────────────────────────────────────────────────
    if (sub === 'list') {
      const warns = await WarnRepository.list(target.id, interaction.guild.id);
      const count = await WarnRepository.count(target.id, interaction.guild.id);

      if (!warns.length) {
        return interaction.editReply({
          embeds: [embedBuilder.success('Aucun avertissement', `<@${target.id}> n'a aucun warn. Clean.`)],
        });
      }

      const lines = warns.slice(0, 10).map((w, i) => {
        const date = new Date(w.createdAt).toLocaleDateString('fr-FR');
        return `**${i + 1}.** ${date} — *${w.reason}* (par <@${w.moderator}>)`;
      });

      const embed = embedBuilder.base(0xFFA500)
        .setTitle(`⚠️ Avertissements de ${target.username}`)
        .setDescription(`**${count} warn${count > 1 ? 's' : ''}** au total\n\n` + lines.join('\n'))
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /warn clear ──────────────────────────────────────────────────────────
    if (sub === 'clear') {
      const deleted = await WarnRepository.clear(target.id, interaction.guild.id);
      logger.info(`[Warn] ${interaction.user.username} a effacé ${deleted} warns de ${target.username}`);

      return interaction.editReply({
        embeds: [embedBuilder.success(
          'Warns effacés',
          `**${deleted}** avertissement${deleted > 1 ? 's' : ''} supprimé${deleted > 1 ? 's' : ''} pour <@${target.id}>.`
        )],
      });
    }
  },
};
