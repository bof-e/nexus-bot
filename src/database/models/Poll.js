const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: mongoose.Schema.Types.Mixed, required: true },
  endTime: { type: Number, required: true },
  createdAt: { type: Number, default: () => Date.now() }
});

module.exports = mongoose.model('Poll', pollSchema);
