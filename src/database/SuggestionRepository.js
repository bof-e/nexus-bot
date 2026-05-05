const Suggestion = require('./models/Suggestion');

class SuggestionRepository {
  async create(discordId, content) {
    return Suggestion.create({ discordId, content });
  }
  async setMessage(id, messageId, channelId) {
    return Suggestion.findByIdAndUpdate(id, { messageId, channelId }, { new: true });
  }
  async vote(id, discordId, type) {
    const s = await Suggestion.findById(id);
    if (!s) return null;
    // Retirer vote opposé si existant
    if (type === 'up') {
      s.downvotes = s.downvotes.filter(u => u !== discordId);
      if (!s.upvotes.includes(discordId)) s.upvotes.push(discordId);
    } else {
      s.upvotes = s.upvotes.filter(u => u !== discordId);
      if (!s.downvotes.includes(discordId)) s.downvotes.push(discordId);
    }
    await s.save();
    return s;
  }
  async setStatus(id, status, adminNote = '') {
    return Suggestion.findByIdAndUpdate(id, { status, adminNote }, { new: true });
  }
  async getRecent(limit = 10) {
    return Suggestion.find().sort({ createdAt: -1 }).limit(limit);
  }
  async getById(id) { return Suggestion.findById(id); }
  async getByMessageId(messageId) { return Suggestion.findOne({ messageId }); }
  async getPending(limit = 5) {
    return Suggestion.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(limit);
  }
}
module.exports = new SuggestionRepository();
