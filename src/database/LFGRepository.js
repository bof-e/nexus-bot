const LFGPost = require('./models/LFGPost');

class LFGRepository {
  async create(discordId, game, description, slots, durationH = 3) {
    return LFGPost.create({
      discordId, game, description,
      slots: Math.min(slots, 20),
      players: [discordId],
      expiresAt: Date.now() + durationH * 3600_000,
    });
  }
  async setMessage(postId, messageId, channelId) {
    return LFGPost.findByIdAndUpdate(postId, { messageId, channelId });
  }
  async join(postId, discordId) {
    const post = await LFGPost.findById(postId);
    if (!post || post.closed) return { error: 'closed' };
    if (post.players.includes(discordId)) return { error: 'already_in' };
    if (post.players.length >= post.slots) return { error: 'full' };
    post.players.push(discordId);
    if (post.players.length >= post.slots) post.closed = true;
    await post.save();
    return { post, full: post.closed };
  }
  async close(postId, ownerId) {
    const post = await LFGPost.findById(postId);
    if (!post) return null;
    if (post.discordId !== ownerId) return { error: 'not_owner' };
    post.closed = true;
    await post.save();
    return post;
  }
  async getActive(game = null) {
    const q = { closed: false, expiresAt: { $gt: Date.now() } };
    if (game) q.game = new RegExp(game, 'i');
    return LFGPost.find(q).sort({ createdAt: -1 }).limit(10);
  }
  async getExpired() {
    return LFGPost.find({ closed: false, expiresAt: { $lte: Date.now() } });
  }
  async closeMany(ids) {
    return LFGPost.updateMany({ _id: { $in: ids } }, { closed: true });
  }
  async getUserActive(discordId) {
    return LFGPost.findOne({ discordId, closed: false, expiresAt: { $gt: Date.now() } });
  }
}
module.exports = new LFGRepository();
