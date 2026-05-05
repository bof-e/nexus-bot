const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, maxlength: 30 },
  tag:         { type: String, required: true, unique: true, maxlength: 5, uppercase: true },
  ownerId:     { type: String, required: true },
  members:     { type: [String], default: [] },
  description: { type: String, default: '' },
  xpTotal:     { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
});

// ✅ FIX : clanSchema.index({ name: 1 }) supprimé — déjà créé par unique: true ci-dessus
clanSchema.index({ members: 1 }); // ← celui-ci reste, il n'est pas dupliqué

module.exports = mongoose.model('Clan', clanSchema);