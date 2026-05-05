const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
  discordId:  { type: String, required: true },
  guildId:    { type: String, required: true },
  reason:     { type: String, default: 'Aucune raison spécifiée' },
  moderator:  { type: String, required: true }, // discordId du modérateur
  createdAt:  { type: Date,   default: Date.now },
});

warningSchema.index({ discordId: 1, guildId: 1 });

module.exports = mongoose.model('Warning', warningSchema);
