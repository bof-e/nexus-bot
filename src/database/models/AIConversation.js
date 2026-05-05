const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true },
  ts:      { type: Number, default: () => Date.now() },
}, { _id: false });

const aiConversationSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  messages:  { type: [messageSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

// TTL : MongoDB supprime automatiquement l'historique après 2h d'inactivité.
aiConversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7200 });
aiConversationSchema.index({ channelId: 1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
