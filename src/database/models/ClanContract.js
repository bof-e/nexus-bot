const mongoose = require('mongoose');

const clanContractSchema = new mongoose.Schema({
  clanId:       { type: String, required: true },      // clan qui offre
  clanName:     { type: String, required: true },
  clanTag:      { type: String, required: true },
  reward:       { type: Number, required: true },      // coins offerts
  xpTarget:     { type: Number, required: true },      // XP à générer
  xpGenerated:  { type: Number, default: 0 },
  duration:     { type: Number, required: true },      // ms
  expiresAt:    { type: Number, required: true },
  mercenaries:  { type: [String], default: [] },       // discordIds engagés
  completed:    { type: Boolean, default: false },
  cancelled:    { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
});

clanContractSchema.index({ completed: 1, cancelled: 1, expiresAt: 1 });

module.exports = mongoose.model('ClanContract', clanContractSchema);
