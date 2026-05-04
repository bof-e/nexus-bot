const UserRepository = require('../database/UserRepository');
const BadgeRepository = require('../database/BadgeRepository');
const { levelFromXP, rankName } = require('../utils/levelCalc');
const config = require('../../config');
const logger = require('../utils/logger');

class XPService {
  /**
   * Ajoute de l'XP à un utilisateur et gère les montées de niveau + badges.
   */
  async addXP(discordId, username, amount, guild = null) {
    const user = await UserRepository.findOrCreate(discordId, username);
    const oldLevel = levelFromXP(user.xp);
    const multiplier = parseFloat(await UserRepository.getSetting('xp_multiplier') || '1');
    const finalAmount = Math.round(amount * multiplier);
    const newXP = await UserRepository.addXP(discordId, finalAmount);
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
      const catalog = BadgeRepository.getCatalog();
      if (catalog[lvlBadgeKey]) {
        const awarded = await BadgeRepository.award(discordId, lvlBadgeKey);
        if (awarded) events.push({ type: 'badge', badge: catalog[lvlBadgeKey] });
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
  async claimDaily(discordId, username) {
    const user = await UserRepository.findOrCreate(discordId, username);
    const now = Date.now();
    const cooldown = config.cooldowns.daily * 1000;
    const lastDaily = user.lastDaily || 0;
    const timeSinceLast = now - lastDaily;

    if (timeSinceLast < cooldown) {
      const remaining = cooldown - timeSinceLast;
      return { success: false, remaining };
    }

    // Calcul du streak
    const oneDayMs = 24 * 3600000;
    const isConsecutive = timeSinceLast < oneDayMs * 2;
    const currentStreak = user.dailyStreak || 0;
    const newStreak = isConsecutive ? currentStreak + 1 : 1;

    const base = config.xp.dailyBonus;
    const streakBonus = Math.min(newStreak * config.xp.dailyBonusStreak, 50);
    const total = base + streakBonus;

    await UserRepository.updateDailyStreak(discordId, newStreak, now);
    await UserRepository.addXP(discordId, total);

    // Badge streak
    const newBadges = [];
    const catalog = BadgeRepository.getCatalog();
    if (newStreak >= 7 && await BadgeRepository.award(discordId, 'loyal')) {
      newBadges.push(catalog['loyal']);
    }
    if (newStreak >= 30 && await BadgeRepository.award(discordId, 'addict')) {
      newBadges.push(catalog['addict']);
    }

    return { success: true, xp: total, streak: newStreak, newBadges };
  }

  /** XP pour message (cooldown anti-spam). */
  async tryAddMessageXP(discordId, username) {
    const user = await UserRepository.findOrCreate(discordId, username);
    const now = Date.now();
    const cooldownMs = config.xp.cooldownMessage * 1000;
    const lastMessageXP = user.lastMessageXP || 0;

    if (now - lastMessageXP < cooldownMs) return null;

    await UserRepository.updateLastMessageXP(discordId, now);
    return this.addXP(discordId, username, config.xp.firstMessageDay);
  }

  /** Vérifie et attribue les badges de temps de jeu. */
  async checkGameBadges(discordId, totalSeconds) {
    const newBadges = [];
    const hours = totalSeconds / 3600;
    const catalog = BadgeRepository.getCatalog();

    if (hours >= 1 && await BadgeRepository.award(discordId, 'first_hour')) {
      newBadges.push(catalog['first_hour']);
    }
    if (hours >= 50 && await BadgeRepository.award(discordId, 'marathon')) {
      newBadges.push(catalog['marathon']);
    }

    // Session nocturne
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && await BadgeRepository.award(discordId, 'nocturnal')) {
      newBadges.push(catalog['nocturnal']);
    }

    return newBadges;
  }
}

module.exports = new XPService();
