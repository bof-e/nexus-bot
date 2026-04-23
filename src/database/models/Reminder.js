const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  id: { type: Number, default: 1, unique: true },
  enabled: { type: Boolean, default: false },
  message: { type: String, default: 'Rappel : préparez-vous pour une session !' },
  expiresAt: { type: Number }
});

module.exports = mongoose.model('Reminder', reminderSchema);
