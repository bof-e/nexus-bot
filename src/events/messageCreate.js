const XPService = require('../services/XPService');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // XP sur message (cooldowné)
    try {
      await XPService.tryAddMessageXP(message.author.id, message.author.username);
    } catch (e) {
      logger.debug(`[Message] Erreur XP message : ${e.message}`);
    }
  },
};
