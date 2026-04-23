const Poll = require('./models/Poll');

class PollRepository {
  async save(messageId, channelId, question, options, endTime) {
    await Poll.findOneAndUpdate(
      { messageId },
      { channelId, question, options, endTime },
      { upsert: true }
    );
  }

  async find(messageId) {
    return Poll.findOne({ messageId });
  }

  async delete(messageId) {
    await Poll.deleteOne({ messageId });
  }

  async getActive() {
    const now = Date.now();
    return Poll.find({ endTime: { $gt: now } });
  }

  async getExpired() {
    const now = Date.now();
    return Poll.find({ endTime: { $lte: now } });
  }
}

module.exports = new PollRepository();
