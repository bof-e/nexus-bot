const mongoose = require('mongoose');

// Progression d'une mission pour un utilisateur donné
const missionProgressSchema = new mongoose.Schema({
  discordId:  { type: String, required: true },
  missionKey: { type: String, required: true },
  progress:   { type: Number, default: 0 },
  completed:  { type: Boolean, default: false },
  claimedAt:  { type: Number, default: 0 },
  periodKey:  { type: String, required: true }, // ex: "2025-W20" ou "2025-05-05"
}, { timestamps: false });

missionProgressSchema.index({ discordId: 1, missionKey: 1, periodKey: 1 }, { unique: true });
missionProgressSchema.index({ periodKey: 1 }); // pour le nettoyage TTL manuel

module.exports = mongoose.model('MissionProgress', missionProgressSchema);
