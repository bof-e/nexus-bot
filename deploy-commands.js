/**
 * Script à lancer une fois pour enregistrer les slash commands.
 *   npm run deploy            → déploiement global (jusqu'à 1h de propagation)
 *   GUILD_ID=xxx npm run deploy → déploiement instantané sur un serveur précis (dev)
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ TOKEN et CLIENT_ID sont requis dans .env');
  process.exit(1);
}

// Collecte des commandes
const commands = [];
function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      try {
        const cmd = require(fullPath);
        if (cmd?.data?.toJSON) {
          commands.push(cmd.data.toJSON());
          console.log(`  ✅ /${cmd.data.name}`);
        }
      } catch (e) {
        console.warn(`  ⚠️  Ignoré : ${fullPath} — ${e.message}`);
      }
    }
  }
}

console.log('📦 Collecte des commandes...');
walkDir(path.join(__dirname, 'src', 'commands'));
console.log(`\n${commands.length} commande(s) trouvée(s)\n`);

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🚀 Déploiement en cours...');

    let data;
    if (GUILD_ID) {
      data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅ ${data.length} commande(s) déployée(s) sur le serveur ${GUILD_ID} (instantané)`);
    } else {
      data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log(`✅ ${data.length} commande(s) déployée(s) globalement (propagation ~1h)`);
    }
  } catch (error) {
    console.error('❌ Erreur de déploiement :', error);
    process.exit(1);
  }
})();
