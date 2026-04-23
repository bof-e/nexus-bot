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

  getCatalog() { return BADGE_CATALOG; }
}

module.exports = new BadgeRepository();
