/**
 * ShadowBadgeService — détecte et attribue les badges secrets.
 * Appelé depuis les événements et commandes existants.
 */
const BadgeRepository = require('../database/BadgeRepository');
const logger          = require('../utils/logger');

// Tracking en mémoire (perd son état au redémarrage, c'est voulu pour le fun)
const _duelLoss  = new Map(); // discordId → { count, firstTs }
const _aiNights  = new Map(); // discordId → Set de dates 'YYYY-MM-DD'
const _ghost     = new Map(); // discordId → lastSeen ts

class ShadowBadgeService {

  /** À appeler après chaque défaite en duel. */
  async onDuelLoss(discordId) {
    const now    = Date.now();
    const record = _duelLoss.get(discordId) || { count: 0, firstTs: now };

    // Reset si plus de 10 minutes depuis la première défaite
    if (now - record.firstTs > 10 * 60_000) {
      _duelLoss.set(discordId, { count: 1, firstTs: now });
      return;
    }

    record.count++;
    _duelLoss.set(discordId, record);

    if (record.count >= 5) {
      const awarded = await BadgeRepository.award(discordId, 'shadow_loser');
      _duelLoss.delete(discordId);
      if (awarded) {
        logger.info('[Shadow] 💀 Skill Issue Certifié attribué à ' + discordId);
        return { badge: BadgeRepository.getCatalogFull().shadow_loser };
      }
    }
    return null;
  }

  /** À appeler quand l'IA répond à quelqu'un. */
  async onAIInteraction(discordId) {
    const now  = new Date();
    const hour = now.getUTCHours();

    // Fenêtre : 3h-5h du matin UTC
    if (hour >= 3 && hour < 5) {
      const dateKey = now.toISOString().slice(0, 10);
      const nights  = _aiNights.get(discordId) || new Set();
      nights.add(dateKey);
      _aiNights.set(discordId, nights);

      if (nights.size >= 3) {
        const awarded = await BadgeRepository.award(discordId, 'shadow_insomniac');
        if (awarded) {
          logger.info('[Shadow] 🌙 Insomniaque attribué à ' + discordId);
          return { badge: BadgeRepository.getCatalogFull().shadow_insomniac };
        }
      }
    }
    return null;
  }

  /** À appeler après chaque achat en boutique. */
  async onPurchase(discordId, totalSpentToday) {
    if (totalSpentToday >= 2000) {
      const awarded = await BadgeRepository.award(discordId, 'shadow_whale');
      if (awarded) {
        logger.info('[Shadow] 🐋 Baleine attribué à ' + discordId);
        return { badge: BadgeRepository.getCatalogFull().shadow_whale };
      }
    }
    return null;
  }

  /** Met à jour le dernier message d'un user (pour le badge Fantôme). */
  updateLastSeen(discordId) {
    _ghost.set(discordId, Date.now());
  }

  /** À appeler quand quelqu'un parle à l'IA après une longue absence. */
  async onReturnAfterSilence(discordId) {
    const last = _ghost.get(discordId);
    if (last && Date.now() - last > 7 * 24 * 3600_000) {
      const awarded = await BadgeRepository.award(discordId, 'shadow_ghost');
      _ghost.set(discordId, Date.now());
      if (awarded) {
        logger.info('[Shadow] 👻 Le Fantôme attribué à ' + discordId);
        return { badge: BadgeRepository.getCatalogFull().shadow_ghost };
      }
    }
    _ghost.set(discordId, Date.now());
    return null;
  }

  /** À appeler quand un utilisateur vote contre une suggestion. */
  async onSuggestionDownvote(discordId, dailyDownvoteCount) {
    if (dailyDownvoteCount >= 5) {
      const awarded = await BadgeRepository.award(discordId, 'shadow_contrarian');
      if (awarded) {
        logger.info('[Shadow] 🗿 Le Contre attribué à ' + discordId);
        return { badge: BadgeRepository.getCatalogFull().shadow_contrarian };
      }
    }
    return null;
  }
}

module.exports = new ShadowBadgeService();
