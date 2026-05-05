const Warning = require('./models/Warning');
const User    = require('./models/User');

// Seuils d'action automatique
const THRESHOLDS = {
  3: { action: 'mute',    duration: 3600_000,     label: '1h de mute' },
  5: { action: 'mute',    duration: 24 * 3600_000, label: '24h de mute' },
  7: { action: 'suggest_kick', duration: 0,        label: 'Kick suggéré aux admins' },
};

class WarnRepository {
  /**
   * Ajoute un avertissement et retourne la sanction automatique déclenchée, si applicable.
   */
  async add(discordId, guildId, reason, moderatorId) {
    await Warning.create({ discordId, guildId, reason, moderator: moderatorId });

    const user = await User.findOneAndUpdate(
      { discordId },
      { $inc: { warnCount: 1 } },
      { new: true, upsert: true }
    );

    const count = user.warnCount;
    const sanction = THRESHOLDS[count] || null;

    if (sanction?.action === 'mute') {
      await User.updateOne(
        { discordId },
        { mutedUntil: Date.now() + sanction.duration }
      );
    }

    return { count, sanction };
  }

  /** Supprime tous les avertissements d'un utilisateur (pardon admin). */
  async clear(discordId, guildId) {
    const { deletedCount } = await Warning.deleteMany({ discordId, guildId });
    await User.updateOne({ discordId }, { warnCount: 0, mutedUntil: 0 });
    return deletedCount;
  }

  /** Liste les avertissements d'un utilisateur. */
  async list(discordId, guildId) {
    return Warning.find({ discordId, guildId }).sort({ createdAt: -1 }).limit(20);
  }

  /** Nombre d'avertissements actifs. */
  async count(discordId, guildId) {
    return Warning.countDocuments({ discordId, guildId });
  }

  getThresholds() { return THRESHOLDS; }
}

module.exports = new WarnRepository();
