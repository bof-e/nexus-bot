const { getDB } = require('./db');

class PollRepository {
  get db() { return getDB(); }

  save(messageId, channelId, question, options, endTime) {
    this.db.prepare(
      'INSERT OR REPLACE INTO polls (message_id, channel_id, question, options, end_time) VALUES (?, ?, ?, ?, ?)'
    ).run(messageId, channelId, question, JSON.stringify(options), endTime);
  }

  find(messageId) {
    const row = this.db.prepare('SELECT * FROM polls WHERE message_id = ?').get(messageId);
    if (!row) return null;
    return { ...row, options: JSON.parse(row.options) };
  }

  delete(messageId) {
    this.db.prepare('DELETE FROM polls WHERE message_id = ?').run(messageId);
  }

  getActive() {
    const now = Date.now();
    const rows = this.db.prepare('SELECT * FROM polls WHERE end_time > ?').all(now);
    return rows.map(r => ({ ...r, options: JSON.parse(r.options) }));
  }

  getExpired() {
    const now = Date.now();
    const rows = this.db.prepare('SELECT * FROM polls WHERE end_time <= ?').all(now);
    return rows.map(r => ({ ...r, options: JSON.parse(r.options) }));
  }
}

module.exports = new PollRepository();
