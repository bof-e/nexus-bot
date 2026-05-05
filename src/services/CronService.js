const cron = require('node-cron');
const MissionRepository = require('../database/MissionRepository');
const RSSService = require('./RSSService');
const GameRepository = require('../database/GameRepository');
const UserRepository = require('../database/UserRepository');
const PollRepository = require('../database/PollRepository');
const ReminderRepository = require('../database/ReminderRepository');
const embedBuilder = require('../utils/embedBuilder');
const config = require('../../config');
const logger = require('../utils/logger');

class CronService {
  start(client) {
    // Récap toutes les 6h
    cron.schedule('0 */6 * * *', () => this._sendRecap(client, 6));

    // Rappels toutes les 6h (si activés)
    cron.schedule('0 */6 * * *', () => this._sendReminder(client));

    // Top jeux quotidien à minuit
    cron.schedule('0 0 * * *', () => this._sendTopGames(client));

    // Vérification RSS toutes les heures
    cron.schedule('0 * * * *', async () => {
      const rssEnabled = (await UserRepository.getSetting('rss_enabled')) !== '0';
      if (rssEnabled) RSSService.checkAll(client);
    });

    // Nettoyage des sondages expirés toutes les 5 minutes
    cron.schedule('*/5 * * * *', () => this._closeExpiredPolls(client));

    // Multiplicateur XP temporaire (reset à minuit)
    cron.schedule('0 0 * * *', () => UserRepository.setSetting('xp_multiplier', '1'));

    logger.info('[Cron] Toutes les tâches planifiées ont démarré');
  }

  async _sendRecap(client, hours) {
    const recapEnabled = (await UserRepository.getSetting('recap_enabled')) !== '0';
    if (!recapEnabled) return;
    const channelId = config.channels.recap;
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;
      const gameData = await GameRepository.getRecentGameStats(hours);
      await channel.send({ embeds: [embedBuilder.recap(hours, gameData)] });
      logger.info('[Cron] Récap envoyé');
    } catch (e) {
      logger.error(`[Cron] Erreur récap : ${e.message}`);
    }
  }

  async _sendReminder(client) {
    const reminder = await ReminderRepository.get();
    if (!reminder?.enabled) return;
    if (reminder.expiresAt && Date.now() > reminder.expiresAt) {
      await ReminderRepository.update({ enabled: false });
      return;
    }

    const channelId = config.channels.reminder;
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;
      await channel.send(`🎮 **Rappel** : ${reminder.message}`);
      logger.info('[Cron] Rappel envoyé');
    } catch (e) {
      logger.error(`[Cron] Erreur rappel : ${e.message}`);
    }
  }

  async _sendTopGames(client) {
    const channelId = config.channels.stats;
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;
      const gameData = await GameRepository.getRecentGameStats(24);
      const top = Object.entries(gameData)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);
      await channel.send({ embeds: [embedBuilder.topGames(24, top)] });
      logger.info('[Cron] Top jeux envoyé');
    } catch (e) {
      logger.error(`[Cron] Erreur top jeux : ${e.message}`);
    }
  }

  async _closeExpiredPolls(client) {
    const expired = await PollRepository.getExpired();
    for (const poll of expired) {
      try {
        const channel = await client.channels.fetch(poll.channelId).catch(() => null);
        if (!channel?.isTextBased()) { 
          await PollRepository.delete(poll.messageId); 
          continue; 
        }

        const message = await channel.messages.fetch(poll.messageId).catch(() => null);
        if (message) {
          await message.fetch();
          const embed = embedBuilder.pollResult(poll.question, poll.options, message.reactions.cache);
          await message.edit({ embeds: [embed] });
        }
        await PollRepository.delete(poll.messageId);
        logger.info(`[Cron] Sondage ${poll.messageId} clôturé`);
      } catch (e) {
        logger.warn(`[Cron] Erreur clôture sondage ${poll.messageId}: ${e.message}`);
        await PollRepository.delete(poll.messageId);
      }
    }
  }
}

module.exports = new CronService();
