const { EmbedBuilder } = require('discord.js');

const COLORS = {
  xp:      0x7F77DD,
  gold:    0xEF9F27,
  success: 0x1D9E75,
  error:   0xE24B4A,
  info:    0x378ADD,
  gaming:  0x534AB7,
  neutral: 0x888780,
  event:   0xD85A30,
};

function base(color = COLORS.info) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp();
}

function error(title, description) {
  return base(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

function success(title, description) {
  return base(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

function profile(user, dbUser, stats, badges) {
  const { levelFromXP, progressPercent, progressBar, rankName, xpForNextLevel } = require('./levelCalc');
  const level = levelFromXP(dbUser.xp);
  const pct = progressPercent(dbUser.xp);
  const bar = progressBar(pct);
  const rank = rankName(level);
  const nextXP = xpForNextLevel(level);

  const topGames = Object.entries(stats)
    .filter(([k]) => !k.endsWith('_start'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([game, secs], i) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const medal = ['🥇', '🥈', '🥉'][i] || '▫️';
      return `${medal} **${game}** — ${h}h ${m}m`;
    });

  const badgeDisplay = badges.length
    ? badges.slice(0, 6).map(b => b.emoji).join(' ')
    : '_Aucun badge pour l\'instant_';

  const embed = base(COLORS.xp)
    .setTitle(`🎮 Profil de ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: `✨ Niveau ${level} — ${rank}`, value: `\`${bar}\` **${pct}%** (${dbUser.xp.toLocaleString()} / ${nextXP.toLocaleString()} XP)`, inline: false },
      { name: '🏆 Top jeux', value: topGames.length ? topGames.join('\n') : '_Aucune session enregistrée_', inline: true },
      { name: '🏅 Badges', value: badgeDisplay, inline: true },
      { name: '📊 Stats', value: `🔥 Streak : **${dbUser.dailyStreak}j**\n📅 Membre depuis <t:${Math.floor(dbUser.createdAt / 1000)}:R>`, inline: false },
    )
    .setFooter({ text: `Nexus · ${user.id}` });

  return embed;
}

function leaderboard(entries, guildName) {
  const medals = ['🥇', '🥈', '🥉'];
  const { levelFromXP, rankName } = require('./levelCalc');

  const lines = entries.map((e, i) => {
    const level = levelFromXP(e.xp);
    const rank = rankName(level);
    const medal = medals[i] || `**${i + 1}.**`;
    return `${medal} <@${e.discordId}> — Nv.${level} · ${e.xp.toLocaleString()} XP · ${rank}`;
  });

  return base(COLORS.gold)
    .setTitle(`🏆 Leaderboard — ${guildName}`)
    .setDescription(lines.join('\n') || '_Aucun membre classé_')
    .setFooter({ text: 'Nexus · Classement mis à jour en temps réel' });
}

function poll(question, options, timeLabel = 'Expire dans 24h') {
  return base(COLORS.gaming)
    .setTitle(`📊 Sondage : ${question}`)
    .setDescription(options.map((opt, i) => `${numberEmoji(i)} ${opt}`).join('\n'))
    .setFooter({ text: timeLabel });
}

function pollResult(question, options, reactions) {
  const total = options.reduce((acc, _, i) => {
    const count = Math.max(0, (reactions.get(numberEmoji(i))?.count ?? 1) - 1);
    return acc + count;
  }, 0);

  const lines = options.map((opt, i) => {
    const emoji = numberEmoji(i);
    const count = Math.max(0, (reactions.get(emoji)?.count ?? 1) - 1);
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    return `${emoji} **${opt}**\n\`${bar}\` ${pct}% (${count} vote${count > 1 ? 's' : ''})`;
  });

  return base(COLORS.success)
    .setTitle(`📊 Résultats : ${question}`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: `${total} vote${total > 1 ? 's' : ''} au total — Sondage terminé` });
}

function recap(hours, gameData) {
  const entries = Object.entries(gameData)
    .filter(([, d]) => d.lastPlayed >= Date.now() - hours * 3600000)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  return base(COLORS.info)
    .setTitle(`📊 Récap — ${hours} dernières heures`)
    .setDescription(
      entries.length
        ? entries.map(([g, d]) => `▫️ **${g}** — ${d.count} session${d.count > 1 ? 's' : ''}`).join('\n')
        : '_Aucune activité sur cette période_'
    )
    .setFooter({ text: 'Nexus · Récap automatique' });
}

function topGames(hours, games) {
  const top = games.slice(0, 5);
  return base(COLORS.gold)
    .setTitle(`📈 Top 5 jeux — ${hours}h`)
    .setDescription(
      top.length
        ? top.map(([g, d], i) => `${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} **${g}** — ${d.count} session${d.count > 1 ? 's' : ''}`).join('\n')
        : '_Aucune donnée_'
    )
    .setFooter({ text: 'Nexus · Stats automatiques' });
}

function gameUpdate(game, title, link) {
  return base(COLORS.event)
    .setTitle(`🔔 Mise à jour — ${game}`)
    .setDescription(`**${title}**\n[Voir l'article](${link})`)
    .setFooter({ text: 'Nexus · Veille RSS' });
}

function duelChallenge(challenger, target) {
  return base(COLORS.event)
    .setTitle('⚔️ Défi lancé !')
    .setDescription(
      `<@${challenger.id}> défie <@${target.id}> en **pierre-feuille-ciseaux** !\n\n`
      + `<@${target.id}>, tu as **30 secondes** pour accepter en réagissant avec ✅`
    )
    .setFooter({ text: 'Nexus · Duels' });
}

function duelResult(winner, loser, winnerChoice, loserChoice, xpGained) {
  return base(COLORS.gold)
    .setTitle('⚔️ Résultat du duel')
    .addFields(
      { name: '🏆 Vainqueur', value: `<@${winner.id}> — **${winnerChoice}**`, inline: true },
      { name: '💀 Perdant',  value: `<@${loser.id}> — **${loserChoice}**`,  inline: true },
      { name: '✨ XP gagné', value: `+${xpGained} XP pour <@${winner.id}>`, inline: false },
    );
}

function quiz(question, timeoutSec = 30) {
  return base(COLORS.gaming)
    .setTitle('🧠 Quiz Gaming !')
    .setDescription(`**${question.text}**\n\nVous avez **${timeoutSec} secondes** pour répondre en chat.`)
    .setFooter({ text: 'Nexus · Quiz' });
}

function welcome(user, xpStart = 0) {
  return base(COLORS.success)
    .setTitle('👋 Bienvenue !')
    .setDescription(
      `Salut **${user.username}** ! Tu arrives avec **${xpStart} XP** de départ.\n\n`
      + `🎮 Joue à des jeux pour gagner de l'XP automatiquement\n`
      + `📊 **/profil** — Voir ton profil et tes badges\n`
      + `🏆 **/top** — Classement du serveur\n`
      + `🎁 **/daily** — Bonus quotidien\n`
      + `📋 **/aide** — Toutes les commandes`
    )
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .setFooter({ text: 'Nexus · Bienvenue sur le serveur' });
}

function numberEmoji(i) {
  const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  return emojis[i] ?? `${i + 1}.`;
}

/**
 * Embed du classement AniList du serveur.
 * @param {Array}  entries   - Stats triées (minutesWatched décroissant)
 * @param {string} guildName - Nom du serveur Discord
 */
function aniboard(entries, guildName) {
  const MEDALS = ['🥇', '🥈', '🥉'];

  const lines = entries.map((e, i) => {
    const medal = MEDALS[i] ?? `**${i + 1}.**`;

    const totalMinutes = e.minutesWatched;
    const days    = Math.floor(totalMinutes / 1440);
    const hours   = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const timeStr = days > 0
      ? `${days}j ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m`;

    return (
      `${medal} <@${e.discordId}> — **[${e.username}](${e.siteUrl})**\n`
      + `┗ ⏱ \`${timeStr}\` · 📺 ${e.episodesWatched.toLocaleString()} épisodes · ✅ ${e.completed} animes terminés`
    );
  });

  // Totaux agrégés
  const totalDays = Math.floor(
    entries.reduce((sum, e) => sum + e.minutesWatched, 0) / 1440
  );
  const totalCompleted = entries.reduce((sum, e) => sum + e.completed, 0);

  return base(0xE8366A) // rose AniList
    .setTitle('🎌 Classement AniList — ' + guildName)
    .setDescription(lines.join('\n\n') || '_Aucune donnée disponible._')
    .addFields({
      name: '📊 Totaux du serveur',
      value: `⏱ **${totalDays.toLocaleString()} jours** cumulés · ✅ **${totalCompleted.toLocaleString()}** animes terminés`,
    })
    .setThumbnail('https://anilist.co/img/icons/icon.svg')
    .setFooter({ text: `Nexus · ${entries.length} membre(s) classé(s) · AniList.co` });
}

module.exports = { base, error, success, profile, leaderboard, poll, pollResult, recap, topGames, gameUpdate, duelChallenge, duelResult, quiz, welcome, aniboard, COLORS, numberEmoji };
