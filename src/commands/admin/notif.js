const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const embedBuilder = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notif')
    .setDescription('Activer/désactiver les notifications de présence (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('on').setDescription('Activer les notifications de présence'))
    .addSubcommand(sub => sub.setName('off').setDescription('Désactiver les notifications de présence'))
    .addSubcommand(sub => sub.setName('status').setDescription('Voir l\'état actuel')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'on') {
      await UserRepository.setSetting('notifications_enabled', '1');
      return interaction.reply({ embeds: [embedBuilder.success('Notifications ON', '🔔 Les messages de présence sont maintenant actifs.')] });
    }
    if (sub === 'off') {
      await UserRepository.setSetting('notifications_enabled', '0');
      return interaction.reply({ embeds: [embedBuilder.success('Notifications OFF', '🔕 Les messages de présence sont désactivés.')] });
    }
    if (sub === 'status') {
      const enabled = (await UserRepository.getSetting('notifications_enabled')) !== '0';
      return interaction.reply({
        embeds: [embedBuilder.base(embedBuilder.COLORS.info)
          .setTitle('🔔 Notifications de présence')
          .setDescription(enabled ? '✅ **Actives** — Les membres reçoivent des messages quand quelqu\'un joue.' : '❌ **Inactives**')
          .setTimestamp()],
        ephemeral: true,
      });
    }
  },
};
