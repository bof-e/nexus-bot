const cron = require('node-cron');
const RSSService = require('./RSSService');
const GameRepository = require('../database/GameRepository');
const UserRepository = require('../database/UserRepository');
const PollRepository = require('../database/PollRepository');
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
    cron.schedule('0 * * * *', () => RSSService.checkAll(client));

    // Nettoyage des sondages expirés toutes les 5 minutes
    cron.schedule('*/5 * * * *', () => this._closeExpiredPolls(client));

    // Multiplicateur XP temporaire (reset à minuit)
    cron.schedule('0 0 * * *', () => UserRepository.setSetting('xp_multiplier', '1'));

    logger.info('[Cron] Toutes les tâches planifiées ont démarré');
  }

  async _sendRecap(client, hours) {
    const channelId = config.channels.recap;
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;
      const gameData = GameRepository.getRecentGameStats(hours);
      await channel.send({ embeds: [embedBuilder.recap(hours, gameData)] });
      logger.info('[Cron] Récap envoyé');
    } catch (e) {
      logger.error(`[Cron] Erreur récap : ${e.message}`);
    }
  }

  async _sendReminder(client) {
    const db = require('../database/db').getDB();
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = 1').get();
    if (!reminder?.enabled) return;
    if (reminder.expires_at && Date.now() > reminder.expires_at) {
      db.prepare('UPDATE reminders SET enabled = 0 WHERE id = 1').run();
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
      const gameData = GameRepository.getRecentGameStats(24);
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
    const expired = PollRepository.getExpired();
    for (const poll of expired) {
      try {
        const channel = await client.channels.fetch(poll.channel_id).catch(() => null);
        if (!channel?.isTextBased()) { PollRepository.delete(poll.message_id); continue; }

        const message = await channel.messages.fetch(poll.message_id).catch(() => null);
        if (message) {
          await message.fetch();
          const embed = embedBuilder.pollResult(poll.question, poll.options, message.reactions.cache);
          await message.edit({ embeds: [embed] });
        }
        PollRepository.delete(poll.message_id);
        logger.info(`[Cron] Sondage ${poll.message_id} clôturé`);
      } catch (e) {
        logger.warn(`[Cron] Erreur clôture sondage ${poll.message_id}: ${e.message}`);
        PollRepository.delete(poll.message_id);
      }
    }
  }
}

module.exports = new CronService();
