const mongoose = require('mongoose');

const emojiStockSchema = new mongoose.Schema({
  emojiId:     { type: String, required: true, unique: true }, // ID ou nom pour emojis unicode
  name:        { type: String, required: true },
  price:       { type: Number, default: 100 },       // prix actuel en coins
  supply:      { type: Number, default: 1000 },      // parts en circulation
  usageCount:  { type: Number, default: 0 },         // usages sur les dernières 24h (reset cron)
  usageTotal:  { type: Number, default: 0 },         // usage total historique
  history:     { type: [Number], default: [] },      // 24 derniers prix (courbe)
  updatedAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmojiStock', emojiStockSchema);
