const Parser = require('rss-parser');
const GameRepository = require('../database/GameRepository');
const embedBuilder = require('../utils/embedBuilder');
const config = require('../../config');
const logger = require('../utils/logger');

const parser = new Parser({ timeout: 10000 });

class RSSService {
  async checkAll(client) {
    const channelId = config.channels.updates;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      logger.warn('[RSS] Canal UPDATE_CHANNEL_ID introuvable ou non textuel');
      return;
    }

    await Promise.allSettled(
      Object.entries(config.rssFeeds).map(([game, url]) =>
        this._checkFeed(channel, game, url)
      )
    );
  }

  async _checkFeed(channel, game, url) {
    try {
      const feed = await parser.parseURL(url);
      const latest = feed.items[0];
      if (!latest) return;

      const updateTime = new Date(latest.pubDate).getTime();
      const lastTime = await GameRepository.getRSSLastUpdate(game);

      if (!lastTime || updateTime > lastTime) {
        const embed = embedBuilder.gameUpdate(game, latest.title, latest.link);
        await channel.send({ embeds: [embed] });
        await GameRepository.setRSSLastUpdate(game, updateTime);
        logger.info(`[RSS] Mise à jour envoyée pour ${game}`);
      }
    } catch (error) {
      logger.warn(`[RSS] Erreur pour ${game}: ${error.message}`);
    }
  }
}

module.exports = new RSSService();
