const mongoose = require('mongoose');

// Achats effectués par les utilisateurs
const purchaseSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  itemKey:   { type: String, required: true },
  boughtAt:  { type: Date,   default: Date.now },
}, { timestamps: false });

// BUG FIX: l'index doit être unique pour éviter les achats en double en cas de race condition
purchaseSchema.index({ discordId: 1, itemKey: 1 }, { unique: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
