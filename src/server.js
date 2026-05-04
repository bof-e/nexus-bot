const express = require('express');
const UserRepository = require('./database/UserRepository');
const GameRepository = require('./database/GameRepository');
const { levelFromXP, rankName } = require('./utils/levelCalc');
const config = require('../config');
const logger = require('./utils/logger');

function startServer(client) {
  const app = express();

  app.get('/', (req, res) => {
    res.status(200).send('Nexus Bot is alive!');
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      botReady: client.isReady(),
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Dashboard public (leaderboard read-only)
  app.get('/leaderboard', async (req, res) => {
    try {
      const topUsers = await UserRepository.topByXP(15);
      const entries = topUsers.map(u => ({
        username: u.username,
        xp: u.xp,
        level: levelFromXP(u.xp),
        rank: rankName(levelFromXP(u.xp)),
      }));

      const rows = entries.map((e, i) =>
        `<tr class="${i < 3 ? `rank-${i + 1}` : ''}">
          <td>${i + 1}</td>
          <td>${escHtml(e.username)}</td>
          <td>${e.level}</td>
          <td>${e.xp.toLocaleString()}</td>
          <td>${escHtml(e.rank)}</td>
        </tr>`
      ).join('');

      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus — Leaderboard</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 2rem; }
    h1 { color: #7F77DD; }
    table { width: 100%; border-collapse: collapse; max-width: 700px; }
    th { background: #534AB7; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #333; }
    tr:hover td { background: #2a2a3e; }
    .rank-1 td:first-child { color: #EF9F27; font-weight: bold; }
    .rank-2 td:first-child { color: #B4B2A9; font-weight: bold; }
    .rank-3 td:first-child { color: #D85A30; font-weight: bold; }
    footer { margin-top: 2rem; color: #666; font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>🏆 Nexus — Leaderboard</h1>
  <table>
    <thead><tr><th>#</th><th>Joueur</th><th>Niveau</th><th>XP</th><th>Rang</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>Mis à jour en temps réel · Nexus Bot v2</footer>
</body>
</html>`);
    } catch (err) {
      logger.error(`[Server] Erreur leaderboard : ${err.message}`);
      res.status(500).send('Erreur interne du serveur');
    }
  });

  const port = config.port;
  app.listen(port, () => {
    logger.info(`[Server] Express démarré sur le port ${port}`);
  }).on('error', (err) => {
    logger.error(`[Server] Erreur démarrage : ${err.message}`);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { startServer };
