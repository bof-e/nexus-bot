const GameSession = require('./models/GameSession');
const GameStat = require('./models/GameStat');
const RSSUpdate = require('./models/RSSUpdate');

class GameRepository {
  async startSession(discordId, gameName) {
    await GameSession.create({
      discordId,
      gameName,
      sessionStart: Date.now()
    });

    // Mise à jour game_stats
    await GameStat.findOneAndUpdate(
      { gameName },
      { $inc: { sessionCount: 1 }, lastPlayed: Date.now() },
      { upsert: true }
    );
  }

  async endSession(discordId, gameName) {
    const session = await GameSession.findOne({
      discordId,
      gameName,
      sessionStart: { $ne: null }
    }).sort({ _id: -1 });

    if (!session) return 0;

    const duration = Math.floor((Date.now() - session.sessionStart) / 1000);
    session.duration = duration;
    session.sessionStart = null;
    session.playedAt = Date.now();
    await session.save();

    return duration;
  }

  /** Temps total par jeu pour un utilisateur. */
  async getUserGameStats(discordId) {
    const results = await GameSession.aggregate([
      { $match: { discordId, sessionStart: null } },
      { $group: { _id: "$gameName", total_seconds: { $sum: "$duration" } } },
      { $sort: { total_seconds: -1 } }
    ]);

    return results.reduce((acc, r) => {
      acc[r._id] = r.total_seconds;
      return acc;
    }, {});
  }

  /** Stats globales pour le récap. */
  async getRecentGameStats(hours) {
    const threshold = Date.now() - hours * 3600000;
    const stats = await GameStat.find({
      lastPlayed: { $gte: threshold }
    }).sort({ sessionCount: -1 });

    return stats.reduce((acc, r) => {
      acc[r.gameName] = { count: r.sessionCount, lastPlayed: r.lastPlayed };
      return acc;
    }, {});
  }

  async getRSSLastUpdate(gameName) {
    const update = await RSSUpdate.findOne({ gameName });
    return update?.updateTime || 0;
  }

  async setRSSLastUpdate(gameName, time) {
    await RSSUpdate.findOneAndUpdate(
      { gameName },
      { updateTime: time },
      { upsert: true }
    );
  }

  async cleanOrphanSessions() {
    return GameSession.updateMany(
      { sessionStart: { $ne: null } },
      { sessionStart: null, duration: 0 }
    );
  }
}

module.exports = new GameRepository();
