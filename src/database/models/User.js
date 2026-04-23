const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  xp: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastMessageXP: { type: Number, default: 0 },
  voteCount: { type: Number, default: 0 },
  notifications: { type: Boolean, default: true },
  createdAt: { type: Number, default: () => Date.now() }
});

userSchema.index({ xp: -1 });

module.exports = mongoose.model('User', userSchema);
