const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nexus.db');

let _db = null;

function getDB() {
  if (_db) return _db;

  // Création du dossier data s'il n'existe pas
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    logger.info(`[DB] Dossier créé : ${DB_DIR}`);
  }

  _db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV !== 'production' ? (msg) => logger.debug(`[SQLite] ${msg}`) : undefined,
  });

  // Performances
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');

  logger.info(`[DB] Base de données ouverte : ${DB_PATH}`);
  return _db;
}

module.exports = { getDB };
