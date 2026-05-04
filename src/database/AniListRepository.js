const AniListUser = require('./models/AniListUser');

class AniListRepository {
  /**
   * Associe (ou met à jour) un pseudo AniList à un Discord ID.
   * Retourne le document après upsert.
   */
  async register(discordId, anilistUsername) {
    return AniListUser.findOneAndUpdate(
      { discordId },
      { anilistUsername, linkedAt: Date.now() },
      { upsert: true, new: true }
    );
  }

  /** Retourne l'entrée AniList d'un utilisateur Discord, ou null. */
  async findByDiscordId(discordId) {
    return AniListUser.findOne({ discordId });
  }

  /** Retourne toutes les associations enregistrées. */
  async findAll() {
    return AniListUser.find();
  }
}

module.exports = new AniListRepository();
