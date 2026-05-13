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

    const user = newPresence?.user || oldPresence?.user;
    if (!user || user.bot) return;

    const oldGame = oldPresence?.activities?.find(a => a.type === 0);
    const newGame = newPresence?.activities?.find(a => a.type === 0);

    const channelId = config.channels.gaming;

    // Fetch du canal uniquement si les notifications sont activées
    let channel = null;
    if (notificationsEnabled && channelId) {
      channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) {
        logger.warn('[Presence] Canal GCHANNEL_ID introuvable');
        channel = null;
      }
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

        if (notificationsEnabled && channel) await channel.send({ embeds: [embed] });

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

        if (notificationsEnabled && channel) await channel.send({ embeds: [embed] });

        // XP proportionnel : cap = maxPerHourPlaying × nombre d'heures (au plafond)
        // Ex : session 2h → max 120 XP, session 10min → max 60 XP
        const rawXP    = Math.floor((duration / 60) * config.xp.perMinutePlaying);
        const hoursCap = Math.max(1, Math.ceil(duration / 3600));
        const xpEarned = Math.min(rawXP, config.xp.maxPerHourPlaying * hoursCap);
        if (xpEarned > 0) {
          await MissionRepository.progress(user.id, 'game_minutes', Math.floor(duration / 60));
          const result = await XPService.addXP(user.id, user.username, xpEarned, guild);
          await _handleXPEvents(result, user, channel);
        }

        const newBadges = await XPService.checkGameBadges(user.id, totalForGame);
        // BUG FIX: vérifier que channel est non-null avant d'envoyer les badges
        if (notificationsEnabled && channel) {
          for (const badge of newBadges) {
            const badgeEmbed = new EmbedBuilder()
              .setColor(0xEF9F27)
              .setDescription(`🏅 **${user.username}** a débloqué le badge **${badge.emoji} ${badge.name}** ! *${badge.desc}*`)
              .setThumbnail(user.displayAvatarURL({ size: 64 }))
              .setTimestamp();
            await channel.send({ embeds: [badgeEmbed] }).catch(err => logger.warn('[Presence] Envoi badge impossible : ' + err.message));
          }
        }

      } else if (oldGame && newGame && oldGame.name !== newGame.name) {
        if (_isDuplicate(`${user.id}:switch:${oldGame.name}:${newGame.name}`)) return;

        // Terminer l'ancienne session ET calculer l'XP (même logique que stop)
        const switchDuration = await GameRepository.endSession(user.id, oldGame.name);
        await GameRepository.startSession(user.id, newGame.name);

        // XP pour la session de l'ancien jeu
        const switchXP = Math.min(
          Math.floor((switchDuration / 60) * config.xp.perMinutePlaying),
          Math.max(config.xp.maxPerHourPlaying, Math.ceil(switchDuration / 3600) * config.xp.maxPerHourPlaying)
        );
        if (switchXP > 0) {
          await MissionRepository.progress(user.id, 'game_minutes', Math.floor(switchDuration / 60));
          const switchResult = await XPService.addXP(user.id, user.username, switchXP, guild);
          await _handleXPEvents(switchResult, user, channel);
        }

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

        if (notificationsEnabled && channel) await channel.send({ embeds: [embed] });
      }
    } catch (e) {
      logger.error(`[Presence] Erreur : ${e.message}`);
    }
  },
};

async function _handleXPEvents(result, user, channel) {
  // BUG FIX: ne pas tenter d'envoyer si channel est null (notifications désactivées ou canal introuvable)
  if (!channel) return;
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
      await channel.send({ embeds: [embed] }).catch(err => logger.warn('[Presence] Envoi level-up impossible : ' + err.message));
    }
    if (event.type === 'badge') {
      const embed = new EmbedBuilder()
        .setColor(0xEF9F27)
        .setDescription(`🏅 <@${user.id}> débloque le badge **${event.badge.emoji} ${event.badge.name}** ! *${event.badge.desc}*`)
        .setThumbnail(user.displayAvatarURL({ size: 64 }))
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(err => logger.warn('[Presence] Envoi badge XP impossible : ' + err.message));
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
