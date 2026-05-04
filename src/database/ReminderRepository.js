const Reminder = require('./models/Reminder');

class ReminderRepository {
  async get() {
    return Reminder.findOne({ id: 1 });
  }

  async update(data) {
    await Reminder.findOneAndUpdate(
      { id: 1 },
      data,
      { upsert: true, new: true }
    );
  }
}

module.exports = new ReminderRepository();
