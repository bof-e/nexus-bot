const UserRepository = require('../database/UserRepository');
const GameRepository = require('../database/GameRepository');
const XPService = require('../services/XPService');
const BadgeRepository = require('../database/BadgeRepository');
const randomResponses = require('../utils/randomResponses');
const embedBuilder = require('../utils/embedBuilder');
const config = require('../../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'presenceUpdate',
  async execute(oldPresence, newPresence, client) {
    // Vérification des notifications globales
    if (UserRepository.getSetting('notifications_enabled') === '0') return;

    const user = newPresence?.user || oldPresence?.user;
    if (!user || user.bot) return;

    const oldGame = oldPresence?.activities?.find(a => a.type === 0);
    const newGame = newPresence?.activities?.find(a => a.type === 0);

    const channelId = config.channels.gaming;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      logger.warn('[Presence] Canal GCHANNEL_ID introuvable');
      return;
    }

    const guild = newPresence?.guild || oldPresence?.guild;

    try {
      if (!oldGame && newGame) {
        // Début de session
        UserRepository.findOrCreate(user.id, user.username);
        GameRepository.startSession(user.id, newGame.name);

        const msg = randomResponses.get('startPlaying', newGame.name, {
          user: user.username,
          game: newGame.name,
        });
        await channel.send(msg);

        // XP pour démarrage de session
        const result = await XPService.addXP(user.id, user.username, config.xp.perMinutePlaying, guild);
        await _handleXPEvents(result, user, channel, guild);

      } else if (oldGame && !newGame) {
        // Fin de session
        const duration = GameRepository.endSession(user.id, oldGame.name);
        const userStats = GameRepository.getUserGameStats(user.id);
        const totalForGame = userStats[oldGame.name] || 0;

        const durationStr = _formatDuration(duration);
        const msg = randomResponses.get('stopPlaying', null, {
          user: user.username,
          game: oldGame.name,
          duration: durationStr,
        });
        await channel.send(msg);

        // XP proportionnel au temps (max 60 XP/h)
        const xpEarned = Math.min(
          Math.floor((duration / 60) * config.xp.perMinutePlaying),
          config.xp.maxPerHourPlaying
        );
        if (xpEarned > 0) {
          const result = await XPService.addXP(user.id, user.username, xpEarned, guild);
          await _handleXPEvents(result, user, channel, guild);
        }

        // Badges de temps de jeu
        const newBadges = XPService.checkGameBadges(user.id, totalForGame);
        for (const badge of newBadges) {
          await channel.send(`🏅 **${user.username}** a débloqué le badge **${badge.emoji} ${badge.name}** ! *${badge.desc}*`);
        }

      } else if (oldGame && newGame && oldGame.name !== newGame.name) {
        // Changement de jeu
        GameRepository.endSession(user.id, oldGame.name);
        GameRepository.startSession(user.id, newGame.name);

        const msg = randomResponses.get('switchGame', null, {
          user: user.username,
          old: oldGame.name,
          new: newGame.name,
        });
        await channel.send(msg);
      }
    } catch (e) {
      logger.error(`[Presence] Erreur : ${e.message}`);
    }
  },
};

async function _handleXPEvents(result, user, channel, guild) {
  for (const event of result.events) {
    if (event.type === 'levelUp') {
      const msg = randomResponses.get('levelUp', null, {
        user: user.username,
        level: event.level,
        rank: event.rank,
      });
      await channel.send({ content: msg });
    }
    if (event.type === 'badge') {
      await channel.send(
        `🏅 <@${user.id}> débloque le badge **${event.badge.emoji} ${event.badge.name}** ! *${event.badge.desc}*`
      );
    }
  }
}

function _formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
