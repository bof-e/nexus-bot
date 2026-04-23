const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class EventLoader {
  load(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    if (!fs.existsSync(eventsPath)) return;

    let loaded = 0;
    for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
      try {
        const event = require(path.join(eventsPath, file));
        if (!event?.name || !event?.execute) {
          logger.warn(`[Events] Fichier ignoré : ${file}`);
          continue;
        }
        const handler = (...args) => event.execute(...args, client);
        if (event.once) {
          client.once(event.name, handler);
        } else {
          client.on(event.name, handler);
        }
        loaded++;
        logger.debug(`[Events] Chargé : ${event.name}${event.once ? ' (once)' : ''}`);
      } catch (e) {
        logger.error(`[Events] Erreur chargement ${file}: ${e.message}`);
      }
    }
    logger.info(`[Events] ${loaded} event(s) chargé(s)`);
  }
}

module.exports = new EventLoader();
