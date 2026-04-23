const mongoose = require('mongoose');
const config = require('../../config');
const logger = require('../utils/logger');

let _isConnected = false;

async function connectDB() {
  if (_isConnected) return;

  try {
    await mongoose.connect(config.mongoUri);
    _isConnected = true;
    logger.info('[DB] Connecté à MongoDB avec succès');
  } catch (err) {
    logger.error(`[DB] Erreur de connexion MongoDB : ${err.message}`);
    process.exit(1);
  }
}

module.exports = { connectDB };
