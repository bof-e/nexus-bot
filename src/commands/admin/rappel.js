const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ReminderRepository = require('../../database/ReminderRepository');
const embedBuilder = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Gérer les rappels automatiques (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('on').setDescription('Activer les rappels (durée 24h)')
    )
    .addSubcommand(sub =>
      sub.setName('off').setDescription('Désactiver les rappels')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Modifier le message de rappel')
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Nouveau message (max 500 caractères)')
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Voir l\'état actuel des rappels')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const reminder = await ReminderRepository.get() || { enabled: false, message: 'Rappel : préparez-vous pour une session !' };

    if (sub === 'on') {
      if (reminder.enabled) {
        return interaction.reply({ embeds: [embedBuilder.error('Rappels', 'Les rappels sont déjà activés.')], ephemeral: true });
      }
      await ReminderRepository.update({ enabled: true, expiresAt: Date.now() + 24 * 3600000 });
      logger.info(`[Rappel] Activé par ${interaction.user.tag}`);
      return interaction.reply({ embeds: [embedBuilder.success('Rappels activés', `Message : "${reminder.message}"\nExpire dans 24h.`)] });
    }

    if (sub === 'off') {
      if (!reminder.enabled) {
        return interaction.reply({ embeds: [embedBuilder.error('Rappels', 'Les rappels sont déjà désactivés.')], ephemeral: true });
      }
      await ReminderRepository.update({ enabled: false, expiresAt: null });
      logger.info(`[Rappel] Désactivé par ${interaction.user.tag}`);
      return interaction.reply({ embeds: [embedBuilder.success('Rappels désactivés', 'Les rappels automatiques sont maintenant off.')] });
    }

    if (sub === 'set') {
      const newMsg = interaction.options.getString('message');
      await ReminderRepository.update({ message: newMsg });
      logger.info(`[Rappel] Message mis à jour par ${interaction.user.tag}: "${newMsg}"`);
      return interaction.reply({ embeds: [embedBuilder.success('Message mis à jour', `Nouveau message de rappel :\n"${newMsg}"`)] });
    }

    if (sub === 'status') {
      const updated = await ReminderRepository.get() || reminder;
      const status = updated.enabled ? `✅ Activé — expire <t:${Math.floor(updated.expiresAt / 1000)}:R>` : '❌ Désactivé';
      return interaction.reply({
        embeds: [embedBuilder.base(embedBuilder.COLORS.info)
          .setTitle('📋 État des rappels')
          .addFields(
            { name: 'Statut', value: status, inline: false },
            { name: 'Message', value: `"${updated.message}"`, inline: false },
          )
          .setTimestamp()],
        ephemeral: true,
      });
    }
  },
};
