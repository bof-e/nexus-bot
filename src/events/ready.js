const CronService = require('../services/CronService');
const PollRepository = require('../database/PollRepository');
const GameRepository = require('../database/GameRepository');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`✅ Nexus connecté en tant que ${client.user.tag}`);

    // Nettoyage des sessions actives au démarrage (bot crash recovery)
    const db = require('../database/db').getDB();
    const cleaned = db.prepare(
      "UPDATE game_sessions SET session_start = NULL, duration = 0 WHERE session_start IS NOT NULL"
    ).run();
    if (cleaned.changes > 0) {
      logger.warn(`[Ready] ${cleaned.changes} session(s) orpheline(s) nettoyée(s)`);
    }

    // Sondages expirés pendant le downtime
    const expired = PollRepository.getExpired();
    for (const poll of expired) {
      try {
        const channel = await client.channels.fetch(poll.channel_id).catch(() => null);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(poll.message_id).catch(() => null);
          if (message) {
            const { pollResult } = require('../utils/embedBuilder');
            await message.fetch();
            await message.edit({ embeds: [pollResult(poll.question, poll.options, message.reactions.cache)] });
          }
        }
        PollRepository.delete(poll.message_id);
        logger.info(`[Ready] Sondage expiré clôturé : ${poll.message_id}`);
      } catch (e) {
        logger.warn(`[Ready] Erreur sondage expiré : ${e.message}`);
        PollRepository.delete(poll.message_id);
      }
    }

    // Statut du bot
    client.user.setPresence({
      activities: [{ name: '/aide | Nexus v2', type: 2 }],
      status: 'online',
    });

    // Démarrage des tâches cron
    CronService.start(client);

    logger.info(`[Ready] ${client.guilds.cache.size} serveur(s) connecté(s)`);
  },
};
