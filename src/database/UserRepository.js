const { getDB } = require('./db');

class UserRepository {
  get db() { return getDB(); }

  /** Retourne ou crée un utilisateur. */
  findOrCreate(discordId, username) {
    const existing = this.db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
    if (existing) {
      if (existing.username !== username) {
        this.db.prepare('UPDATE users SET username = ? WHERE discord_id = ?').run(username, discordId);
        existing.username = username;
      }
      return existing;
    }
    this.db.prepare(
      'INSERT INTO users (discord_id, username) VALUES (?, ?)'
    ).run(discordId, username);
    return this.db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  }

  findById(discordId) {
    return this.db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  }

  addXP(discordId, amount) {
    this.db.prepare('UPDATE users SET xp = xp + ? WHERE discord_id = ?').run(amount, discordId);
    return this.db.prepare('SELECT xp FROM users WHERE discord_id = ?').get(discordId)?.xp;
  }

  updateDailyStreak(discordId, streak, lastDaily) {
    this.db.prepare(
      'UPDATE users SET daily_streak = ?, last_daily = ? WHERE discord_id = ?'
    ).run(streak, lastDaily, discordId);
  }

  updateLastMessageXP(discordId, timestamp) {
    this.db.prepare('UPDATE users SET last_message_xp = ? WHERE discord_id = ?').run(timestamp, discordId);
  }

  topByXP(limit = 10) {
    return this.db.prepare('SELECT * FROM users ORDER BY xp DESC LIMIT ?').all(limit);
  }

  getSetting(key) {
    return this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value;
  }

  setSetting(key, value) {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  }
}

module.exports = new UserRepository();
