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
    try {
      const cleaned = await GameRepository.cleanOrphanSessions();
      if (cleaned.modifiedCount > 0) {
        logger.warn(`[Ready] ${cleaned.modifiedCount} session(s) orpheline(s) nettoyée(s)`);
      }
    } catch (e) {
      logger.error(`[Ready] Erreur nettoyage sessions orphelines : ${e.message}`);
    }

    // Sondages expirés pendant le downtime
    try {
      const expired = await PollRepository.getExpired();
      for (const poll of expired) {
        try {
          const channel = await client.channels.fetch(poll.channelId).catch(() => null);
          if (channel?.isTextBased()) {
            const message = await channel.messages.fetch(poll.messageId).catch(() => null);
            if (message) {
              const { pollResult } = require('../utils/embedBuilder');
              await message.fetch();
              await message.edit({ embeds: [pollResult(poll.question, poll.options, message.reactions.cache)] });
            }
          }
          await PollRepository.delete(poll.messageId);
          logger.info(`[Ready] Sondage expiré clôturé : ${poll.messageId}`);
        } catch (e) {
          logger.warn(`[Ready] Erreur sondage expiré : ${e.message}`);
          await PollRepository.delete(poll.messageId);
        }
      }
    } catch (e) {
      logger.error(`[Ready] Erreur récupération sondages expirés : ${e.message}`);
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
