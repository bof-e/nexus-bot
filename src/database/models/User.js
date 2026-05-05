const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  xp: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastMessageXP: { type: Number, default: 0 },
  voteCount: { type: Number, default: 0 },
  duelWins:  { type: Number, default: 0 }, // BUG FIX: champ manquant pour badge champion
  notifications: { type: Boolean, default: true },
  coins:         { type: Number, default: 0 },
  warnCount:     { type: Number, default: 0 },
  mutedUntil:    { type: Number, default: 0 },
  reputation:    { type: Number, default: 0 },
  createdAt:     { type: Number, default: () => Date.now() }
});

userSchema.index({ xp: -1 });

module.exports = mongoose.model('User', userSchema);
