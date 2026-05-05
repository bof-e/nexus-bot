const mongoose = require('mongoose');
const suggestionSchema = new mongoose.Schema({
  discordId:  { type: String, required: true },
  messageId:  { type: String, default: null },
  channelId:  { type: String, default: null },
  content:    { type: String, required: true },
  status:     { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  upvotes:    { type: [String], default: [] },
  downvotes:  { type: [String], default: [] },
  adminNote:  { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});
module.exports = mongoose.model('Suggestion', suggestionSchema);
