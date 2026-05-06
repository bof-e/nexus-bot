const cron = require('node-cron');
const MissionRepository = require('../database/MissionRepository');
const LFGRepository          = require('../database/LFGRepository');
const EmojiStockRepository   = require('../database/EmojiStockRepository');
const ContractRepository     = require('../database/ContractRepository');
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

    // Reset quotidien de la bourse aux emojis (minuit UTC)
    cron.schedule('0 0 * * *', () => this._resetBourse());

    // Vérification des contrats expirés toutes les 30 minutes
    cron.schedule('*/30 * * * *', () => this._expireContracts(client));

    // Nettoyage LFG expirés toutes les 10 minutes
    cron.schedule('*/10 * * * *', () => this._closeExpiredLFG(client));

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

  async _resetBourse() {
    try {
      const n = await EmojiStockRepository.dailyReset();
      logger.info('[Cron] Bourse reset : ' + n + ' emojis mis à jour');
    } catch (e) {
      logger.warn('[Cron] Erreur reset bourse : ' + e.message);
    }
  }

  async _expireContracts(client) {
    try {
      const expired = await ContractRepository.getExpired();
      for (const c of expired) {
        await ContractRepository.cancel(c._id);
        // Rembourser si non complété
        if (!c.completed) {
          const UserRepository = require('../database/UserRepository');
          await UserRepository.addCoins(c.mercenaries[0] || c.clanId, c.reward).catch(() => {});
          logger.info('[Cron] Contrat expiré remboursé : ' + c._id);
        }
      }
    } catch (e) {
      logger.warn('[Cron] Erreur expiration contrats : ' + e.message);
    }
  }

  async _closeExpiredLFG(client) {
    try {
      const expired = await LFGRepository.getExpired();
      if (!expired.length) return;
      const ids = expired.map(p => p._id);
      await LFGRepository.closeMany(ids);
      // Mettre à jour les messages Discord
      for (const post of expired) {
        if (!post.messageId || !post.channelId) continue;
        try {
          const ch  = await client.channels.fetch(post.channelId).catch(() => null);
          const msg = await ch?.messages.fetch(post.messageId).catch(() => null);
          if (msg) {
            const embed = msg.embeds[0];
            if (embed) await msg.edit({ components: [] }); // Retirer les boutons
          }
        } catch {}
      }
      logger.info('[Cron] ' + expired.length + ' LFG expirés fermés');
    } catch (e) {
      logger.warn('[Cron] Erreur nettoyage LFG : ' + e.message);
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
