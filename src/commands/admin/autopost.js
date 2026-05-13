const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const UserRepository     = require('../../database/UserRepository');
const ReminderRepository = require('../../database/ReminderRepository');
const embedBuilder       = require('../../utils/embedBuilder');
const logger             = require('../../utils/logger');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getFlags() {
  const [recap, rss, notif, reminder] = await Promise.all([
    UserRepository.getSetting('recap_enabled'),
    UserRepository.getSetting('rss_enabled'),
    UserRepository.getSetting('notifications_enabled'),
    ReminderRepository.get(),
  ]);
  return {
    recap:   recap  !== '0',   // défaut : actif
    rss:     rss    !== '0',   // défaut : actif
    notif:   notif  !== '0',   // défaut : actif
    rappel:  reminder?.enabled ?? false,
    rappelMsg: reminder?.message ?? '—',
    rappelExp: reminder?.expiresAt ?? null,
  };
}

function statusEmoji(on) { return on ? '✅' : '❌'; }

// ─── Commande ───────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autopost')
    .setDescription('Gérer les messages automatiques du bot (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // /autopost status
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Voir l\'état de tous les messages automatiques')
    )

    // /autopost recap
    .addSubcommand(sub =>
      sub.setName('recap')
        .setDescription('Activer ou désactiver le récap XP automatique (toutes les 6h)')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('On ou Off')
            .setRequired(true)
            .addChoices(
              { name: '✅ Activer',   value: 'on'  },
              { name: '❌ Désactiver', value: 'off' }
            )
        )
    )

    // /autopost rss
    .addSubcommand(sub =>
      sub.setName('rss')
        .setDescription('Activer ou désactiver les mises à jour RSS (patch notes jeux)')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('On ou Off')
            .setRequired(true)
            .addChoices(
              { name: '✅ Activer',   value: 'on'  },
              { name: '❌ Désactiver', value: 'off' }
            )
        )
    )

    // /autopost notif
    .addSubcommand(sub =>
      sub.setName('notif')
        .setDescription('Activer ou désactiver les notifications de présence (gaming)')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('On ou Off')
            .setRequired(true)
            .addChoices(
              { name: '✅ Activer',   value: 'on'  },
              { name: '❌ Désactiver', value: 'off' }
            )
        )
    )

    // /autopost rappel
    .addSubcommand(sub =>
      sub.setName('rappel')
        .setDescription('Activer ou désactiver les rappels planifiés')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('On ou Off')
            .setRequired(true)
            .addChoices(
              { name: '✅ Activer',   value: 'on'  },
              { name: '❌ Désactiver', value: 'off' }
            )
        )
    ),

  // ─── Execute ──────────────────────────────────────────────────────────────

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub    = interaction.options.getSubcommand();
    const action = interaction.options.getString('action'); // null pour 'status'

    // ── /autopost status ────────────────────────────────────────────────────
    if (sub === 'status') {
      const f = await getFlags();

      const rappelValue = f.rappel
        ? `✅ Actif — expire <t:${Math.floor(f.rappelExp / 1000)}:R>\n*"${f.rappelMsg}"*`
        : '❌ Inactif';

      const embed = embedBuilder.base(embedBuilder.COLORS.gaming)
        .setTitle('📬 Messages automatiques — état actuel')
        .setDescription('Utilise `/autopost <type> on/off` pour modifier.')
        .addFields(
          {
            name: `${statusEmoji(f.recap)} Récap XP`,
            value: 'Classement XP toutes les 6h' + (f.recap ? '' : '\n*Désactivé*'),
            inline: true,
          },
          {
            name: `${statusEmoji(f.rss)} Mises à jour RSS`,
            value: 'Patch notes jeux (vérif. toutes les heures)' + (f.rss ? '' : '\n*Désactivé*'),
            inline: true,
          },
          { name: '\u200b', value: '\u200b', inline: false }, // séparateur
          {
            name: `${statusEmoji(f.notif)} Notifs de présence`,
            value: 'Messages quand un membre lance un jeu' + (f.notif ? '' : '\n*Désactivé*'),
            inline: true,
          },
          {
            name: `${statusEmoji(f.rappel)} Rappels planifiés`,
            value: rappelValue,
            inline: true,
          },
        )
        .setFooter({ text: 'Nexus · /autopost <type> on/off pour modifier' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /autopost recap ──────────────────────────────────────────────────────
    if (sub === 'recap') {
      const on = action === 'on';
      await UserRepository.setSetting('recap_enabled', on ? '1' : '0');
      logger.info('[Autopost] Récap ' + (on ? 'activé' : 'désactivé') + ' par ' + interaction.user.username);
      return interaction.editReply({
        embeds: [on
          ? embedBuilder.success('Récap XP activé', '📊 Le classement XP sera posté automatiquement toutes les 6h.')
          : embedBuilder.error('Récap XP désactivé', '📊 Le récap automatique est maintenant off.')],
      });
    }

    // ── /autopost rss ────────────────────────────────────────────────────────
    if (sub === 'rss') {
      const on = action === 'on';
      await UserRepository.setSetting('rss_enabled', on ? '1' : '0');
      logger.info('[Autopost] RSS ' + (on ? 'activé' : 'désactivé') + ' par ' + interaction.user.username);
      return interaction.editReply({
        embeds: [on
          ? embedBuilder.success('RSS activé', '📰 Les mises à jour de patch notes seront postées automatiquement.')
          : embedBuilder.error('RSS désactivé', '📰 Les mises à jour RSS sont maintenant off.')],
      });
    }

    // ── /autopost notif ──────────────────────────────────────────────────────
    if (sub === 'notif') {
      const on = action === 'on';
      await UserRepository.setSetting('notifications_enabled', on ? '1' : '0');
      logger.info('[Autopost] Notifs présence ' + (on ? 'activées' : 'désactivées') + ' par ' + interaction.user.username);
      return interaction.editReply({
        embeds: [on
          ? embedBuilder.success('Notifications activées', '🔔 Les membres verront quand quelqu\'un lance un jeu.')
          : embedBuilder.error('Notifications désactivées', '🔕 Les notifications de présence sont maintenant off.')],
      });
    }

    // ── /autopost rappel ─────────────────────────────────────────────────────
    if (sub === 'rappel') {
      const on = action === 'on';
      const reminder = await ReminderRepository.get();

      if (on) {
        await ReminderRepository.update({
          enabled:   true,
          expiresAt: Date.now() + 24 * 3600_000,
          message:   reminder?.message ?? 'Rappel : préparez-vous pour une session !',
        });
        logger.info('[Autopost] Rappels activés par ' + interaction.user.username);
        return interaction.editReply({
          embeds: [embedBuilder.success(
            'Rappels activés',
            '⏰ Les rappels sont maintenant actifs pour 24h.\n' +
            '*Message : "' + (reminder?.message ?? 'Rappel : préparez-vous pour une session !') + '"*\n\n' +
            'Modifie le message avec /rappel set.'
          )],
        });
      } else {
        await ReminderRepository.update({ enabled: false, expiresAt: null });
        logger.info('[Autopost] Rappels désactivés par ' + interaction.user.username);
        return interaction.editReply({
          embeds: [embedBuilder.error('Rappels désactivés', '⏰ Les rappels automatiques sont maintenant off.')],
        });
      }
    }
  },
};
