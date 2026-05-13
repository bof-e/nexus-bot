const Badge = require('./models/Badge');

const BADGE_CATALOG = {
  // Temps de jeu
  first_hour:   { key: 'first_hour',   name: 'Premier pas',   emoji: '👣', desc: '1ère heure de jeu' },
  marathon:     { key: 'marathon',     name: 'Marathonien',   emoji: '🏃', desc: '50h de jeu cumulées' },
  nocturnal:    { key: 'nocturnal',    name: 'Vampire Gaming', emoji: '🧛', desc: 'Session après minuit' },
  // Participation
  voter:        { key: 'voter',        name: 'Sondeur',       emoji: '🗳️', desc: '10 votes dans des sondages' },
  democrat:     { key: 'democrat',     name: 'Démocrate',     emoji: '🗽', desc: '50 votes cumulés' },
  // Régularité
  loyal:        { key: 'loyal',        name: 'Fidèle',        emoji: '🔥', desc: '7 jours de streak' },
  addict:       { key: 'addict',       name: 'Habitué',       emoji: '💎', desc: '30 jours de streak' },
  // Duels
  fighter:      { key: 'fighter',      name: 'Combattant',    emoji: '⚔️', desc: 'Premier duel gagné' },
  champion:     { key: 'champion',     name: 'Champion',      emoji: '🏆', desc: '10 duels gagnés' },
  undefeated: {
    key: 'undefeated', name: '🔥 Imbattable', emoji: '🔥',
    desc: 'Remporter 5 duels consécutifs sans défaite',
    shadow: false,
  },

  // ── Badges Shadow (cachés jusqu'à déblocage) ────────────────────────
  shadow_ghost: {
    key: 'shadow_ghost',   name: '👻 Le Fantôme',        emoji: '👻',
    desc: "Absent 7 jours puis retour brutal avec l'IA",
    shadow: true,
    hint: '...',
  },
  shadow_loser: {
    key: 'shadow_loser',   name: '💀 Skill Issue Certifié', emoji: '💀',
    desc: "Perdre 5 duels d'affilée en moins de 10 minutes",
    shadow: true,
    hint: '...',
  },
  shadow_insomniac: {
    key: 'shadow_insomniac', name: '🌙 Insomniaque Certifié', emoji: '🌙',
    desc: "Parler à l'IA entre 3h et 5h du matin — 3 nuits consécutives",
    shadow: true,
    hint: '...',
  },
  shadow_whale: {
    key: 'shadow_whale',   name: '🐋 Baleine',             emoji: '🐋',
    desc: 'Dépenser 2000 coins en boutique en une journée',
    shadow: true,
    hint: '...',
  },
  shadow_contrarian: {
    key: 'shadow_contrarian', name: '🗿 Le Contre',         emoji: '🗿',
    desc: 'Voter contre toutes les suggestions en une journée (min 5)',
    shadow: true,
    hint: '...',
  },

  // Niveaux
  lvl5:         { key: 'lvl5',         name: 'Rookie',        emoji: '🌱', desc: 'Niveau 5 atteint' },
  lvl15:        { key: 'lvl15',        name: 'Vétéran',       emoji: '⚔️', desc: 'Niveau 15 atteint' },
  lvl30:        { key: 'lvl30',        name: 'Légende',       emoji: '✨', desc: 'Niveau 30 atteint' },
};

class BadgeRepository {
  async getUserBadges(discordId) {
    const badges = await Badge.find({ discordId });
    return badges.map(r => ({
      ...BADGE_CATALOG[r.badgeKey],
      earnedAt: r.earnedAt,
    })).filter(b => b.key); // filter out if key not found in catalog
  }

  async hasBadge(discordId, badgeKey) {
    const badge = await Badge.findOne({ discordId, badgeKey });
    return !!badge;
  }

  /** Retourne true si le badge a été nouvellement attribué. */
  async award(discordId, badgeKey) {
    const alreadyHas = await this.hasBadge(discordId, badgeKey);
    if (alreadyHas) return false;

    try {
      await Badge.create({ discordId, badgeKey });
      return true;
    } catch (err) {
      // In case of race condition (unique index)
      return false;
    }
  }

  getCatalog() {
    // Filtrer les badges shadow non encore débloqués globalement
    return Object.fromEntries(
      Object.entries(BADGE_CATALOG).filter(([, b]) => !b.shadow)
    );
  }

  getCatalogFull()   { return BADGE_CATALOG; } // pour vérifications internes
  getShadowCatalog() { return Object.fromEntries(Object.entries(BADGE_CATALOG).filter(([, b]) => b.shadow)); }

  async getUnlockedShadows() {
    const Badge    = require('./models/Badge');
    const shadowKeys = Object.keys(BADGE_CATALOG).filter(k => BADGE_CATALOG[k].shadow);
    const found = await Badge.distinct('badgeKey', { badgeKey: { $in: shadowKeys } });
    return found.map(k => BADGE_CATALOG[k]).filter(Boolean);
  }
}

module.exports = new BadgeRepository();
