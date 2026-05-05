const mongoose = require('mongoose');

/**
 * Association Discord ID ↔ pseudo AniList.
 * Un utilisateur ne peut avoir qu'un seul compte AniList lié.
 */
const aniListUserSchema = new mongoose.Schema({
  discordId:      { type: String, required: true, unique: true },
  anilistUsername:{ type: String, required: true },
  linkedAt:       { type: Number, default: () => Date.now() },
});

aniListUserSchema.index({ discordId: 1 });

module.exports = mongoose.model('AniListUser', aniListUserSchema);
