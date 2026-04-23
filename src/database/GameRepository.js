const { getDB } = require('./db');

class GameRepository {
  get db() { return getDB(); }

  startSession(discordId, gameName) {
    this.db.prepare(
      'INSERT INTO game_sessions (discord_id, game_name, session_start) VALUES (?, ?, ?)'
    ).run(discordId, gameName, Date.now());

    // Mise à jour game_stats
    const existing = this.db.prepare('SELECT * FROM game_stats WHERE game_name = ?').get(gameName);
    if (existing) {
      this.db.prepare(
        'UPDATE game_stats SET session_count = session_count + 1, last_played = ? WHERE game_name = ?'
      ).run(Date.now(), gameName);
    } else {
      this.db.prepare(
        'INSERT INTO game_stats (game_name, session_count, last_played) VALUES (?, 1, ?)'
      ).run(gameName, Date.now());
    }
  }

  endSession(discordId, gameName) {
    const session = this.db.prepare(
      `SELECT * FROM game_sessions 
       WHERE discord_id = ? AND game_name = ? AND session_start IS NOT NULL
       ORDER BY id DESC LIMIT 1`
    ).get(discordId, gameName);

    if (!session) return 0;

    const duration = Math.floor((Date.now() - session.session_start) / 1000);
    this.db.prepare(
      'UPDATE game_sessions SET duration = ?, session_start = NULL, played_at = ? WHERE id = ?'
    ).run(duration, Date.now(), session.id);

    return duration;
  }

  /** Temps total par jeu pour un utilisateur. */
  getUserGameStats(discordId) {
    const rows = this.db.prepare(
      `SELECT game_name, SUM(duration) as total_seconds
       FROM game_sessions WHERE discord_id = ? AND session_start IS NULL
       GROUP BY game_name ORDER BY total_seconds DESC`
    ).all(discordId);

    return rows.reduce((acc, r) => {
      acc[r.game_name] = r.total_seconds;
      return acc;
    }, {});
  }

  /** Stats globales pour le récap. */
  getRecentGameStats(hours) {
    const threshold = Date.now() - hours * 3600000;
    const rows = this.db.prepare(
      `SELECT game_name, session_count, last_played FROM game_stats
       WHERE last_played >= ? ORDER BY session_count DESC`
    ).all(threshold);

    return rows.reduce((acc, r) => {
      acc[r.game_name] = { count: r.session_count, lastPlayed: r.last_played };
      return acc;
    }, {});
  }

  getRSSLastUpdate(gameName) {
    return this.db.prepare('SELECT update_time FROM rss_last_update WHERE game_name = ?').get(gameName)?.update_time || 0;
  }

  setRSSLastUpdate(gameName, time) {
    this.db.prepare(
      'INSERT OR REPLACE INTO rss_last_update (game_name, update_time) VALUES (?, ?)'
    ).run(gameName, time);
  }
}

module.exports = new GameRepository();
