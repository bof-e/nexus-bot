const mongoose = require('mongoose');

// Achats effectués par les utilisateurs
const purchaseSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  itemKey:   { type: String, required: true },
  boughtAt:  { type: Date,   default: Date.now },
}, { timestamps: false });

purchaseSchema.index({ discordId: 1, itemKey: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
