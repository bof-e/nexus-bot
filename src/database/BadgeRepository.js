const { getDB } = require('./db');

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
  get db() { return getDB(); }

  getUserBadges(discordId) {
    const rows = this.db.prepare('SELECT badge_key, earned_at FROM badges WHERE discord_id = ?').all(discordId);
    return rows.map(r => ({
      ...BADGE_CATALOG[r.badge_key],
      earnedAt: r.earned_at,
    })).filter(Boolean);
  }

  hasBadge(discordId, badgeKey) {
    return !!this.db.prepare('SELECT 1 FROM badges WHERE discord_id = ? AND badge_key = ?').get(discordId, badgeKey);
  }

  /** Retourne true si le badge a été nouvellement attribué. */
  award(discordId, badgeKey) {
    if (this.hasBadge(discordId, badgeKey)) return false;
    this.db.prepare('INSERT OR IGNORE INTO badges (discord_id, badge_key) VALUES (?, ?)').run(discordId, badgeKey);
    return true;
  }

  getCatalog() { return BADGE_CATALOG; }
}

module.exports = new BadgeRepository();
