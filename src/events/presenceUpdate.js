const { EmbedBuilder } = require('discord.js');
const UserRepository = require('../database/UserRepository');
const GameRepository = require('../database/GameRepository');
const MissionRepository = require('../database/MissionRepository');
const XPService = require('../services/XPService');
const randomResponses = require('../utils/randomResponses');
const config = require('../../config');
const logger = require('../utils/logger');

// FIX DOUBLON : le bot dans N serveurs déclenche N fois presenceUpdate pour le même user.
// On mémorise les actions récentes (userId + action + jeu) pendant 10s pour dédupliquer.
const _recentEvents = new Map();
function _isDuplicate(key) {
  const now = Date.now();
  if (_recentEvents.has(key) && now - _recentEvents.get(key) < 10000) return true;
  _recentEvents.set(key, now);
  for (const [k, t] of _recentEvents) {
    if (now - t > 30000) _recentEvents.delete(k);
  }
  return false;
}

const GAME_COLORS = {
  'Genshin Impact':  0x4A90D9,
  'Warframe':        0x4AC3D9,
  'Wuthering Waves': 0x6B4AD9,
};
const DEFAULT_COLOR = 0x534AB7;

module.exports = {
  name: 'presenceUpdate',
  async execute(oldPresence, newPresence, client) {
    const notificationsEnabled = (await UserRepository.getSetting('notifications_enabled')) !== '0';
    if (!notificationsEnabled) return;

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
        if (_isDuplicate(`${user.id}:start:${newGame.name}`)) return;

        await UserRepository.findOrCreate(user.id, user.username);
        await GameRepository.startSession(user.id, newGame.name);

        const description = randomResponses.get('startPlaying', newGame.name, {
          user: user.username,
          game: newGame.name,
        });

        const embed = new EmbedBuilder()
          .setColor(GAME_COLORS[newGame.name] ?? DEFAULT_COLOR)
          .setDescription(description)
          .setThumbnail(user.displayAvatarURL({ size: 64 }))
          .setTimestamp();

        await channel.send({ embeds: [embed] });

      } else if (oldGame && !newGame) {
        if (_isDuplicate(`${user.id}:stop:${oldGame.name}`)) return;

        const duration = await GameRepository.endSession(user.id, oldGame.name);
        const userStats = await GameRepository.getUserGameStats(user.id);
        const totalForGame = userStats[oldGame.name] || 0;
        const durationStr = _formatDuration(duration);

        const description = randomResponses.get('stopPlaying', null, {
          user: user.username,
          game: oldGame.name,
          duration: durationStr,
        });

        const embed = new EmbedBuilder()
          .setColor(0x888780)
          .setDescription(description)
          .setThumbnail(user.displayAvatarURL({ size: 64 }))
          .setTimestamp();

        await channel.send({ embeds: [embed] });

        const xpEarned = Math.min(
          Math.floor((duration / 60) * config.xp.perMinutePlaying),
          config.xp.maxPerHourPlaying
        );
        if (xpEarned > 0) {
          const result = await MissionRepository.progress(user.id, 'game_minutes', Math.floor(sessionMinutes));
    await XPService.addXP(user.id, user.username, xpEarned, guild);
          await _handleXPEvents(result, user, channel);
        }

        const newBadges = await XPService.checkGameBadges(user.id, totalForGame);
        for (const badge of newBadges) {
          const badgeEmbed = new EmbedBuilder()
            .setColor(0xEF9F27)
            .setDescription(`🏅 **${user.username}** a débloqué le badge **${badge.emoji} ${badge.name}** ! *${badge.desc}*`)
            .setThumbnail(user.displayAvatarURL({ size: 64 }))
            .setTimestamp();
          await channel.send({ embeds: [badgeEmbed] });
        }

      } else if (oldGame && newGame && oldGame.name !== newGame.name) {
        if (_isDuplicate(`${user.id}:switch:${oldGame.name}:${newGame.name}`)) return;

        await GameRepository.endSession(user.id, oldGame.name);
        await GameRepository.startSession(user.id, newGame.name);

        const description = randomResponses.get('switchGame', null, {
          user: user.username,
          old: oldGame.name,
          new: newGame.name,
        });

        const embed = new EmbedBuilder()
          .setColor(GAME_COLORS[newGame.name] ?? DEFAULT_COLOR)
          .setDescription(description)
          .setThumbnail(user.displayAvatarURL({ size: 64 }))
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (e) {
      logger.error(`[Presence] Erreur : ${e.message}`);
    }
  },
};

async function _handleXPEvents(result, user, channel) {
  for (const event of result.events) {
    if (event.type === 'levelUp') {
      const msg = randomResponses.get('levelUp', null, {
        user: user.username,
        level: event.level,
        rank: event.rank,
      });
      const embed = new EmbedBuilder()
        .setColor(0xEF9F27)
        .setDescription(msg)
        .setThumbnail(user.displayAvatarURL({ size: 64 }))
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    }
    if (event.type === 'badge') {
      const embed = new EmbedBuilder()
        .setColor(0xEF9F27)
        .setDescription(`🏅 <@${user.id}> débloque le badge **${event.badge.emoji} ${event.badge.name}** ! *${event.badge.desc}*`)
        .setThumbnail(user.displayAvatarURL({ size: 64 }))
        .setTimestamp();
      await channel.send({ embeds: [embed] });
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
