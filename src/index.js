// Chargement de la config en premier (valide les variables d'env)
const config = require('../config');
const logger = require('./utils/logger');

logger.info('🚀 Démarrage de Nexus Bot v2...');

// Fonction de démarrage asynchrone
async function bootstrap() {
  // Connexion DB
  const { connectDB } = require('./database/db');
  await connectDB();

  // Client Discord
  const { Client, GatewayIntentBits, Partials } = require('discord.js');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
      Partials.User,
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
    ],
  });

  // Chargement des commandes et events
  const CommandLoader = require('./loaders/CommandLoader');
  const EventLoader = require('./loaders/EventLoader');

  CommandLoader.load(client);
  EventLoader.load(client);

  // Serveur Express (keep-alive + dashboard)
  const { startServer } = require('./server');
  startServer(client);

  // Nettoyage cooldowns toutes les heures
  const CooldownManager = require('./services/CooldownManager');
  setInterval(() => CooldownManager.cleanup(), 3600 * 1000);

  // Connexion
  client.login(config.token).catch((err) => {
    logger.error(`[Login] Impossible de se connecter : ${err.message}`);
    process.exit(1);
  });
}

// Lancement
bootstrap();
