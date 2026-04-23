const path = require('path');
const fs = require('fs');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

class CommandLoader {
  load(client) {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, '..', 'commands');

    let loaded = 0;
    this._walkDir(commandsPath, (filePath) => {
      try {
        const command = require(filePath);
        if (!command?.data?.name || !command?.execute) {
          logger.warn(`[Commands] Fichier ignoré (pas de data.name ou execute) : ${filePath}`);
          return;
        }
        client.commands.set(command.data.name, command);
        loaded++;
        logger.debug(`[Commands] Chargé : /${command.data.name}`);
      } catch (e) {
        logger.error(`[Commands] Erreur chargement ${filePath}: ${e.message}`);
      }
    });

    logger.info(`[Commands] ${loaded} commande(s) chargée(s)`);
    return client.commands;
  }

  _walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this._walkDir(fullPath, callback);
      } else if (entry.name.endsWith('.js')) {
        callback(fullPath);
      }
    }
  }
}

module.exports = new CommandLoader();
