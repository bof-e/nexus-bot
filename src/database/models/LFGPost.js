const mongoose = require('mongoose');
const lfgSchema = new mongoose.Schema({
  discordId:  { type: String, required: true },
  messageId:  { type: String, default: null },
  channelId:  { type: String, default: null },
  game:       { type: String, required: true },
  description:{ type: String, default: '' },
  slots:      { type: Number, default: 4 },
  players:    { type: [String], default: [] }, // discordIds
  expiresAt:  { type: Number, required: true },
  closed:     { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
});
lfgSchema.index({ expiresAt: 1 });
lfgSchema.index({ discordId: 1, closed: 1 });
module.exports = mongoose.model('LFGPost', lfgSchema);
