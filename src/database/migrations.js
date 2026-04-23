const { getDB } = require('./db');
const logger = require('../utils/logger');

function runMigrations() {
  const db = getDB();

  db.exec(`
    -- Utilisateurs et XP
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id    TEXT    NOT NULL UNIQUE,
      username      TEXT    NOT NULL,
      xp            INTEGER NOT NULL DEFAULT 0,
      daily_streak  INTEGER NOT NULL DEFAULT 0,
      last_daily    INTEGER NOT NULL DEFAULT 0,
      last_message_xp INTEGER NOT NULL DEFAULT 0,
      notifications INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
    CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

    -- Statistiques de jeu (remplace playerTimeStats)
    CREATE TABLE IF NOT EXISTS game_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id  TEXT    NOT NULL,
      game_name   TEXT    NOT NULL,
      duration    INTEGER NOT NULL DEFAULT 0,
      session_start INTEGER,
      played_at   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(discord_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON game_sessions(game_name);

    -- Stats globales des jeux (remplace gameStats)
    CREATE TABLE IF NOT EXISTS game_stats (
      game_name   TEXT    PRIMARY KEY,
      session_count INTEGER NOT NULL DEFAULT 0,
      last_played INTEGER NOT NULL DEFAULT 0
    );

    -- Sondages actifs (remplace polls)
    CREATE TABLE IF NOT EXISTS polls (
      message_id  TEXT    PRIMARY KEY,
      channel_id  TEXT    NOT NULL,
      question    TEXT    NOT NULL,
      options     TEXT    NOT NULL,
      end_time    INTEGER NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    -- Badges
    CREATE TABLE IF NOT EXISTS badges (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id  TEXT    NOT NULL,
      badge_key   TEXT    NOT NULL,
      earned_at   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      UNIQUE(discord_id, badge_key)
    );
    CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(discord_id);

    -- Mises à jour RSS (remplace lastUpdateTimes)
    CREATE TABLE IF NOT EXISTS rss_last_update (
      game_name   TEXT    PRIMARY KEY,
      update_time INTEGER NOT NULL DEFAULT 0
    );

    -- Rappels
    CREATE TABLE IF NOT EXISTS reminders (
      id          INTEGER PRIMARY KEY,
      enabled     INTEGER NOT NULL DEFAULT 0,
      message     TEXT    NOT NULL DEFAULT 'Rappel : préparez-vous pour une session !',
      expires_at  INTEGER
    );
    INSERT OR IGNORE INTO reminders (id, enabled, message) VALUES (1, 0, 'Rappel : préparez-vous pour une session !');

    -- Notifications globales
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notifications_enabled', '1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('event_active', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('xp_multiplier', '1');
  `);

  logger.info('[DB] Migrations appliquées avec succès');
}

module.exports = { runMigrations };
