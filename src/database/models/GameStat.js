const mongoose = require('mongoose');

const gameStatSchema = new mongoose.Schema({
  gameName: { type: String, required: true, unique: true },
  sessionCount: { type: Number, default: 0 },
  lastPlayed: { type: Number, default: 0 }
});

module.exports = mongoose.model('GameStat', gameStatSchema);
