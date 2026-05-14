const UserRepository     = require('../database/UserRepository');
const MissionRepository  = require('../database/MissionRepository');
const ClanRepository     = require('../database/ClanRepository');
const ContractRepository = require('../database/ContractRepository');
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
    // Vérifier boost personnel actif (acheté en boutique)
    let multiplier = parseFloat(await UserRepository.getSetting('xp_multiplier') || '1');
    const boostRaw = await UserRepository.getSetting('xp_boost_' + discordId);
    if (boostRaw) {
      try {
        const boost = JSON.parse(boostRaw);
        if (boost?.expiry > Date.now()) {
          multiplier = Math.max(multiplier, boost.multiplier);
        } else {
          await UserRepository.setSetting('xp_boost_' + discordId, '');
        }
      } catch {
        await UserRepository.setSetting('xp_boost_' + discordId, ''); // nettoyer valeur corrompue
      }
    }
    const finalAmount = Math.round(amount * multiplier);
    const newXP = await UserRepository.addXP(discordId, finalAmount);
    const newLevel = levelFromXP(newXP);

    const events = [];

    if (newLevel > oldLevel) {
      events.push({ type: 'levelUp', level: newLevel, rank: rankName(newLevel) });

      // Attribution du rôle pour le niveau final atteint
      if (guild) {
        await this._handleRoleReward(discordId, newLevel, guild);
      }

      // Badges : vérifier CHAQUE niveau intermédiaire (ex: sauter de 2 à 5 → vérifier lvl3, lvl4, lvl5)
      const catalog = BadgeRepository.getCatalog();
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const lvlBadgeKey = `lvl${lvl}`;
        if (catalog[lvlBadgeKey]) {
          const awarded = await BadgeRepository.award(discordId, lvlBadgeKey);
          if (awarded) events.push({ type: 'badge', badge: catalog[lvlBadgeKey] });
        }
      }
    }

    // Contrats mercenaires : contribuer à l'objectif XP si enrôlé
    try {
      const activeContracts = await ContractRepository.getByMercenary(discordId);
      for (const contract of activeContracts) {
        const updated = await ContractRepository.contributeXP(contract._id, finalAmount);
        if (updated?.completed) {
          // Distribuer la récompense équitablement entre mercenaires
          const share = Math.floor(contract.reward / Math.max(1, contract.mercenaries.length));
          for (const mId of contract.mercenaries) {
            await UserRepository.addCoins(mId, share);
          }
          logger.info('[Contract] Contrat ' + contract._id + ' complété ! ' + share + ' coins/mercenaire');
        }
      }
    } catch {}

    // XP Clan : contribution au clan si l'utilisateur en a un
    try {
      const clan = await ClanRepository.findByMember(discordId);
      if (clan) await ClanRepository.addXP(clan._id, finalAmount);
    } catch {}

    // Coins : 1 coin par 5 XP gagné
    const coinsEarned = Math.floor(finalAmount / 5);
    if (coinsEarned > 0) await UserRepository.addCoins(discordId, coinsEarned);

    return { xp: newXP, level: newLevel, gained: finalAmount, coinsEarned, events };
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
    const xpResult = await this.addXP(discordId, username, total);

    // Badge streak
    const newBadges = [];
    const catalog = BadgeRepository.getCatalog();
    if (newStreak >= 7 && await BadgeRepository.award(discordId, 'loyal')) {
      newBadges.push(catalog['loyal']);
    }
    if (newStreak >= 30 && await BadgeRepository.award(discordId, 'addict')) {
      newBadges.push(catalog['addict']);
    }

    // Missions
    try {
      const missionResults = await MissionRepository.progress(discordId, 'daily');
      for (const r of missionResults.filter(r => r.completed)) {
        await UserRepository.addXP(discordId, r.mission.xp);
        await UserRepository.addCoins(discordId, r.mission.coins);
        newBadges.push({ emoji: '🎯', name: r.mission.name, desc: r.mission.desc });
      }
      if (newStreak >= 7) await MissionRepository.progress(discordId, 'streak_7');
    } catch (err) {
      logger.error(`[XPService] Erreur progression mission daily pour ${discordId} : ${err.message}`);
    }

    return { success: true, xp: xpResult.gained, streak: newStreak, newBadges, events: xpResult.events };
  }

  /** XP pour message (cooldown anti-spam). */
  async tryAddMessageXP(discordId, username) {
    const user = await UserRepository.findOrCreate(discordId, username);
    const now = Date.now();
    const cooldownMs = config.xp.cooldownMessage * 1000;
    const lastMessageXP = user.lastMessageXP || 0;

    if (now - lastMessageXP < cooldownMs) return null;

    await UserRepository.updateLastMessageXP(discordId, now);
    await MissionRepository.progress(discordId, 'message');
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
