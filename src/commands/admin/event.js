const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const embedBuilder = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

// BUG FIX: stocker le timer pour pouvoir l'annuler si /event stop est appelé avant expiration
let _eventTimer = null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Lancer un événement spécial XP (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Démarre un événement XP x2')
        .addIntegerOption(opt =>
          opt.setName('duree')
            .setDescription('Durée en minutes (défaut 30)')
            .setMinValue(5)
            .setMaxValue(120)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stop').setDescription('Arrêter l\'événement en cours')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const dureeMins = interaction.options.getInteger('duree') ?? 30;
      await UserRepository.setSetting('xp_multiplier', '2');
      await UserRepository.setSetting('event_active', '1');

      logger.info(`[Event] XP x2 démarré par ${interaction.user.username} pour ${dureeMins}min`);

      // Annuler un éventuel timer précédent
      if (_eventTimer) { clearTimeout(_eventTimer); _eventTimer = null; }

      await interaction.reply({
        embeds: [embedBuilder.base(embedBuilder.COLORS.event)
          .setTitle('⚡ Événement XP x2 lancé !')
          .setDescription(`Tous les gains d'XP sont **doublés** pendant **${dureeMins} minutes** !\n\n🎮 Jouez, votez, participez — chaque action rapporte 2× plus d'XP.`)
          .setTimestamp()],
      });

      // Reset automatique
      _eventTimer = setTimeout(async () => {
        _eventTimer = null;
        await UserRepository.setSetting('xp_multiplier', '1');
        await UserRepository.setSetting('event_active', '0');
        interaction.channel.send({
          embeds: [embedBuilder.base(embedBuilder.COLORS.neutral)
            .setTitle('⏱️ Événement XP x2 terminé')
            .setDescription('Le multiplicateur d\'XP est revenu à la normale. Merci d\'avoir participé !')
            .setTimestamp()],
        }).catch(() => {});
        logger.info('[Event] XP x2 terminé automatiquement');
      }, dureeMins * 60 * 1000);

      return;
    }

    if (sub === 'stop') {
      await UserRepository.setSetting('xp_multiplier', '1');
      await UserRepository.setSetting('event_active', '0');
      // BUG FIX: annuler le timer si l'événement est arrêté manuellement
      if (_eventTimer) { clearTimeout(_eventTimer); _eventTimer = null; }
      logger.info(`[Event] Arrêté par ${interaction.user.username}`);
      return interaction.reply({
        embeds: [embedBuilder.success('Événement arrêté', 'Le multiplicateur XP est revenu à ×1.')],
      });
    }
  },
};
