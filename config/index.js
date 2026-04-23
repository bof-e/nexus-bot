require('dotenv').config();

const required = ['TOKEN', 'CLIENT_ID', 'MONGODB_URI'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[Config] Variables d'environnement manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  mongoUri: process.env.MONGODB_URI,
  port: parseInt(process.env.PORT || '3000', 10),
  isDev: process.env.NODE_ENV !== 'production',

  channels: {
    recap:    process.env.RECAP_CHANNEL_ID    || null,
    reminder: process.env.REMINDER_CHANNEL_ID || null,
    updates:  process.env.UPDATE_CHANNEL_ID   || null,
    stats:    process.env.STATS_CHANNEL_ID    || null,
    gaming:   process.env.GCHANNEL_ID         || null,
  },

  roles: {
    rookie:  process.env.ROLE_ROOKIE_ID  || null,
    veteran: process.env.ROLE_VETERAN_ID || null,
    legend:  process.env.ROLE_LEGEND_ID  || null,
  },

  // Système XP
  xp: {
    perMinutePlaying:  5,
    maxPerHourPlaying: 60,
    voteInPoll:        15,
    dailyBonus:        25,
    dailyBonusStreak:  2,   // multiplicateur par jour de streak
    participateEvent:  50,
    winDuel:           30,
    firstMessageDay:   10,
    cooldownMessage:   60,  // secondes entre 2 gains de XP par message
  },

  // Niveaux : XP requis = niveau² × 100
  levels: {
    formula: (lvl) => lvl * lvl * 100,
    rolesAt: { 5: 'rookie', 15: 'veteran', 30: 'legend' },
  },

  // RSS feeds
  rssFeeds: {
    'Warframe':        'https://forums.warframe.com/forum/3-pc-update-notes.xml/',
    'Genshin Impact':  'https://genshin-feed.com/feed/atom-fr-updates.xml',
    'Wuthering Waves': 'https://wutheringwaves.gg/news/notice/feed/',
  },

  // Cooldowns (secondes)
  cooldowns: {
    daily:   23 * 3600,
    duel:    300,
    quiz:    30,
    poll:    0,
    stats:   10,
  },
};
