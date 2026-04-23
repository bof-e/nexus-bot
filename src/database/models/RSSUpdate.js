const mongoose = require('mongoose');

const rssUpdateSchema = new mongoose.Schema({
  gameName: { type: String, required: true, unique: true },
  updateTime: { type: Number, default: 0 }
});

module.exports = mongoose.model('RSSUpdate', rssUpdateSchema);
