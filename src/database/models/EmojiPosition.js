const mongoose = require('mongoose');

// Parts détenues par un utilisateur sur un emoji
const emojiPositionSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  emojiId:   { type: String, required: true },
  shares:    { type: Number, default: 0 },
  avgPrice:  { type: Number, default: 0 }, // prix moyen d'achat
});

emojiPositionSchema.index({ discordId: 1, emojiId: 1 }, { unique: true });

module.exports = mongoose.model('EmojiPosition', emojiPositionSchema);
