const mongoose = require('mongoose');
const seasonStatSchema = new mongoose.Schema({
  season:     { type: Number, required: true },
  discordId:  { type: String, required: true },
  username:   { type: String, required: true },
  xp:         { type: Number, default: 0 },
  finalRank:  { type: Number, default: 0 },
});
seasonStatSchema.index({ season: 1, xp: -1 });
seasonStatSchema.index({ season: 1, discordId: 1 }, { unique: true });
module.exports = mongoose.model('SeasonStat', seasonStatSchema);
