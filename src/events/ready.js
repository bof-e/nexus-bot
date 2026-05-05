const CronService = require('../services/CronService');
const PollRepository = require('../database/PollRepository');
const GameRepository = require('../database/GameRepository');
const config = require('../../config');
const logger = require('../utils/logger');

const UserRepository = require('../database/UserRepository');
module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`✅ Nexus connecté en tant que ${client.user.tag}`);

    // Nettoyage des sessions orphelines
    try {
      const cleaned = await GameRepository.cleanOrphanSessions();
      if (cleaned.modifiedCount > 0) {
        logger.warn(`[Ready] ${cleaned.modifiedCount} session(s) orpheline(s) nettoyée(s)`);
      }
    } catch (e) {
      logger.error(`[Ready] Erreur nettoyage sessions : ${e.message}`);
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

    // Restauration du salon IA depuis la DB (persistance entre redémarrages)
    try {
      const savedAiChannel = await UserRepository.getSetting('ai_channel');
      if (savedAiChannel) {
        config.channels.ai = savedAiChannel;
        logger.info('[Ready] Salon IA restauré : ' + savedAiChannel);
      }
    } catch (e) {
      logger.warn('[Ready] Impossible de restaurer le salon IA : ' + e.message);
    }

    // Vérification des canaux configurés
    const configuredChannels = Object.values(config.channels).filter(Boolean);
    if (configuredChannels.length === 0) {
      logger.warn("[Ready] Aucun canal configuré — le bot sera silencieux.");
    }

    logger.info(`[Ready] ${client.guilds.cache.size} serveur(s) connecté(s)`);
  },
};