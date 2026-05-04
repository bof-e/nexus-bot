const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  badgeKey: { type: String, required: true },
  earnedAt: { type: Number, default: () => Date.now() }
});

badgeSchema.index({ discordId: 1, badgeKey: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
