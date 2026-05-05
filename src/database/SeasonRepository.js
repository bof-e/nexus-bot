const SeasonStat = require('./models/SeasonStat');
const User       = require('./models/User');
const Setting    = require('./models/Setting');

class SeasonRepository {
  async getCurrentSeason() {
    const s = await Setting.findOne({ key: 'current_season' });
    return parseInt(s?.value || '1', 10);
  }
  async getSeasonStart() {
    const s = await Setting.findOne({ key: 'season_start' });
    return s ? parseInt(s.value, 10) : Date.now();
  }

  /** Snapshot XP actuel de tous les users dans SeasonStat. */
  async snapshot(season) {
    const users = await User.find().lean();
    const ops = users.map(u => ({
      updateOne: {
        filter: { season, discordId: u.discordId },
        update: { $set: { username: u.username, xp: u.xp } },
        upsert: true,
      },
    }));
    if (ops.length) await SeasonStat.bulkWrite(ops);
    return users.length;
  }

  /** Archive + reset XP + incrément de saison. */
  async endSeason(season) {
    // 1. Snapshot final
    await this.snapshot(season);
    // 2. Attribuer rangs finaux
    const stats = await SeasonStat.find({ season }).sort({ xp: -1 });
    const ops = stats.map((s, i) => ({
      updateOne: { filter: { _id: s._id }, update: { $set: { finalRank: i + 1 } } },
    }));
    if (ops.length) await SeasonStat.bulkWrite(ops);
    // 3. Reset XP de tous les users
    await User.updateMany({}, { $set: { xp: 0 } });
    // 4. Incrémenter saison
    await Setting.findOneAndUpdate(
      { key: 'current_season' },
      { value: String(season + 1) },
      { upsert: true }
    );
    await Setting.findOneAndUpdate(
      { key: 'season_start' },
      { value: String(Date.now()) },
      { upsert: true }
    );
    return stats.slice(0, 3); // podium
  }

  async getLeaderboard(season, limit = 10) {
    return SeasonStat.find({ season }).sort({ xp: -1 }).limit(limit);
  }
  async getUserStat(season, discordId) {
    return SeasonStat.findOne({ season, discordId });
  }
}
module.exports = new SeasonRepository();
