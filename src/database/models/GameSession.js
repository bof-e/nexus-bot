const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  gameName: { type: String, required: true },
  duration: { type: Number, default: 0 },
  sessionStart: { type: Number },
  playedAt: { type: Number, default: () => Date.now() }
});

gameSessionSchema.index({ discordId: 1 });
gameSessionSchema.index({ gameName: 1 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
