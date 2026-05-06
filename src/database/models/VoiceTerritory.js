const mongoose = require('mongoose');

// Territoire vocal capturé par un clan
const voiceTerritorySchema = new mongoose.Schema({
  channelId:   { type: String, required: true, unique: true },
  clanId:      { type: String, required: true },
  clanName:    { type: String, required: true },
  clanTag:     { type: String, required: true },
  capturedAt:  { type: Date, default: Date.now },
  minutesHeld: { type: Number, default: 0 },          // minutes totales de contrôle
});

module.exports = mongoose.model('VoiceTerritory', voiceTerritorySchema);
