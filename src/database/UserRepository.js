const User = require('./models/User');
const Setting = require('./models/Setting');

class UserRepository {
  /** Retourne ou crée un utilisateur. */
  async findOrCreate(discordId, username) {
    let user = await User.findOne({ discordId });
    if (user) {
      if (user.username !== username) {
        user.username = username;
        await user.save();
      }
      return user;
    }
    user = new User({ discordId, username });
    await user.save();
    return user;
  }

  async findById(discordId) {
    return User.findOne({ discordId });
  }

  async addXP(discordId, amount) {
    const user = await User.findOneAndUpdate(
      { discordId },
      { $inc: { xp: amount } },
      { new: true }
    );
    return user?.xp;
  }

  async updateDailyStreak(discordId, streak, lastDaily) {
    await User.updateOne(
      { discordId },
      { dailyStreak: streak, lastDaily }
    );
  }

  async updateLastMessageXP(discordId, timestamp) {
    await User.updateOne(
      { discordId },
      { lastMessageXP: timestamp }
    );
  }

  async topByXP(limit = 10) {
    return User.find().sort({ xp: -1 }).limit(limit);
  }

  async getSetting(key) {
    const setting = await Setting.findOne({ key });
    return setting?.value;
  }

  async setSetting(key, value) {
    await Setting.findOneAndUpdate(
      { key },
      { value: String(value) },
      { upsert: true }
    );
  }
}

module.exports = new UserRepository();
