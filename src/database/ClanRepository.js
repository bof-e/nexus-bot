const Clan = require('./models/Clan');

class ClanRepository {
  async create(ownerId, name, tag, description) {
    return Clan.create({ name, tag: tag.toUpperCase(), ownerId, members: [ownerId], description });
  }
  async findByMember(discordId) { return Clan.findOne({ members: discordId }); }
  async findByName(name) { return Clan.findOne({ name: new RegExp(`^${name}$`, 'i') }); }
  async findByTag(tag) { return Clan.findOne({ tag: tag.toUpperCase() }); }
  async join(clanId, discordId) {
    return Clan.findByIdAndUpdate(
      clanId, { $addToSet: { members: discordId } }, { new: true }
    );
  }
  async leave(clanId, discordId) {
    return Clan.findByIdAndUpdate(
      clanId, { $pull: { members: discordId } }, { new: true }
    );
  }
  async addXP(clanId, amount) {
    return Clan.findByIdAndUpdate(clanId, { $inc: { xpTotal: amount } }, { new: true });
  }
  async top(limit = 10) {
    return Clan.find().sort({ xpTotal: -1 }).limit(limit);
  }
  async delete(clanId) { return Clan.findByIdAndDelete(clanId); }
}
module.exports = new ClanRepository();
