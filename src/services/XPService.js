const UserRepository = require('../database/UserRepository');
const BadgeRepository = require('../database/BadgeRepository');
const { levelFromXP, xpForLevel, rankName } = require('../utils/levelCalc');
const randomResponses = require('../utils/randomResponses');
const embedBuilder = require('../utils/embedBuilder');
const config = require('../../config');
const logger = require('../utils/logger');

class XPService {
  /**
   * Ajoute de l'XP à un utilisateur et gère les montées de niveau + badges.
   * Retourne les événements survenus pour les envoyer dans un canal si besoin.
   */
  async addXP(discordId, username, amount, guild = null) {
    const user = UserRepository.findOrCreate(discordId, username);
    const oldLevel = levelFromXP(user.xp);
    const multiplier = parseFloat(UserRepository.getSetting('xp_multiplier') || '1');
    const finalAmount = Math.round(amount * multiplier);
    const newXP = UserRepository.addXP(discordId, finalAmount);
    const newLevel = levelFromXP(newXP);

    const events = [];

    if (newLevel > oldLevel) {
      events.push({ type: 'levelUp', level: newLevel, rank: rankName(newLevel) });

      // Attribution des rôles
      if (guild) {
        await this._handleRoleReward(discordId, newLevel, guild);
      }

      // Badge de niveau
      const lvlBadgeKey = `lvl${newLevel}`;
      if (BadgeRepository.getCatalog()[lvlBadgeKey]) {
        const awarded = BadgeRepository.award(discordId, lvlBadgeKey);
        if (awarded) events.push({ type: 'badge', badge: BadgeRepository.getCatalog()[lvlBadgeKey] });
      }
    }

    return { xp: newXP, level: newLevel, gained: finalAmount, events };
  }

  async _handleRoleReward(discordId, level, guild) {
    const roleMap = config.levels.rolesAt;
    const roleKey = roleMap[level];
    if (!roleKey) return;

    const roleId = config.roles[roleKey];
    if (!roleId) return;

    try {
      const member = await guild.members.fetch(discordId).catch(() => null);
      const role = guild.roles.cache.get(roleId);
      if (member && role) {
        await member.roles.add(role);
        logger.info(`[XP] Rôle ${roleKey} attribué à ${discordId}`);
      }
    } catch (e) {
      logger.warn(`[XP] Impossible d'attribuer le rôle : ${e.message}`);
    }
  }

  /** Bonus quotidien avec gestion du streak. */
  claimDaily(discordId, username) {
    const user = UserRepository.findOrCreate(discordId, username);
    const now = Date.now();
    const cooldown = config.cooldowns.daily * 1000;
    const timeSinceLast = now - user.last_daily;

    if (timeSinceLast < cooldown) {
      const remaining = cooldown - timeSinceLast;
      return { success: false, remaining };
    }

    // Calcul du streak
    const oneDayMs = 24 * 3600000;
    const isConsecutive = timeSinceLast < oneDayMs * 2;
    const newStreak = isConsecutive ? user.daily_streak + 1 : 1;

    const base = config.xp.dailyBonus;
    const streakBonus = Math.min(newStreak * config.xp.dailyBonusStreak, 50);
    const total = base + streakBonus;

    UserRepository.updateDailyStreak(discordId, newStreak, now);
    UserRepository.addXP(discordId, total);

    // Badge streak
    const newBadges = [];
    if (newStreak >= 7 && BadgeRepository.award(discordId, 'loyal')) {
      newBadges.push(BadgeRepository.getCatalog()['loyal']);
    }
    if (newStreak >= 30 && BadgeRepository.award(discordId, 'addict')) {
      newBadges.push(BadgeRepository.getCatalog()['addict']);
    }

    return { success: true, xp: total, streak: newStreak, newBadges };
  }

  /** XP pour message (cooldown anti-spam). */
  tryAddMessageXP(discordId, username) {
    const user = UserRepository.findOrCreate(discordId, username);
    const now = Date.now();
    const cooldownMs = config.xp.cooldownMessage * 1000;

    if (now - user.last_message_xp < cooldownMs) return null;

    UserRepository.updateLastMessageXP(discordId, now);
    return this.addXP(discordId, username, config.xp.firstMessageDay);
  }

  /** Vérifie et attribue les badges de temps de jeu. */
  checkGameBadges(discordId, totalSeconds) {
    const newBadges = [];
    const hours = totalSeconds / 3600;

    if (hours >= 1 && BadgeRepository.award(discordId, 'first_hour')) {
      newBadges.push(BadgeRepository.getCatalog()['first_hour']);
    }
    if (hours >= 50 && BadgeRepository.award(discordId, 'marathon')) {
      newBadges.push(BadgeRepository.getCatalog()['marathon']);
    }

    // Session nocturne
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && BadgeRepository.award(discordId, 'nocturnal')) {
      newBadges.push(BadgeRepository.getCatalog()['nocturnal']);
    }

    return newBadges;
  }
}

module.exports = new XPService();
