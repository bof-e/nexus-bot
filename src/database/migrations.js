/**
 * BUG FIX: Ce fichier était un vestige d'une ancienne version SQLite (better-sqlite3).
 * Il importait `getDB` qui n'existe pas dans db.js (Mongoose), et utilisait `db.exec()`
 * (API SQLite) alors que le projet utilise intégralement Mongoose/MongoDB.
 * Il n'était importé nulle part → code mort + crash garanti si jamais importé.
 *
 * Les "migrations" Mongoose se gèrent via les schémas et les index définis dans /models/*.
 * Ce fichier est conservé comme documentation de l'ancienne structure.
 */

// Rien à faire : Mongoose crée automatiquement les collections et les index
// définis dans les schémas (models/User.js, models/Badge.js, etc.)
// au premier accès, via { upsert: true } ou lors des premières insertions.

module.exports = {};
