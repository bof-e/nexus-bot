const { SlashCommandBuilder } = require('discord.js');
const UserRepository    = require('../../database/UserRepository');
const GameRepository    = require('../../database/GameRepository');
const BadgeRepository   = require('../../database/BadgeRepository');
const ClanRepository    = require('../../database/ClanRepository');
const AniListRepository = require('../../database/AniListRepository');
const SeasonRepository  = require('../../database/SeasonRepository');
const embedBuilder      = require('../../utils/embedBuilder');
const { levelFromXP, xpForNextLevel } = require('../../utils/levelCalc');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche le profil gaming d\'un membre')
    .addUserOption(opt =>
      opt.setName('utilisateur')
        .setDescription('Membre à afficher (toi par défaut)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur') ?? interaction.user;
    await interaction.deferReply();

    const [dbUser, gameStats, badges, clan, aniEntry] = await Promise.all([
      UserRepository.findOrCreate(target.id, target.username),
      GameRepository.getUserGameStats(target.id),
      BadgeRepository.getUserBadges(target.id),
      ClanRepository.findByMember(target.id),
      AniListRepository.findByDiscordId(target.id).catch(() => null),
    ]);

    // Rang de saison
    const season = await SeasonRepository.getCurrentSeason();
    await SeasonRepository.snapshot(season);
    const allSeason = await SeasonRepository.getLeaderboard(season, 500);
    const seasonRank = allSeason.findIndex(s => s.discordId === target.id) + 1;

    const level  = levelFromXP(dbUser.xp || 0);
    const nextXP = xpForNextLevel(level);
    const xp     = dbUser.xp || 0;
    const xpPct  = Math.min(100, Math.floor((xp / nextXP) * 100));
    const barFull = Math.floor(xpPct / 10);
    const xpBar  = '█'.repeat(barFull) + '░'.repeat(10 - barFull);

    const embed = embedBuilder.base(0x5865F2)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ size: 64 }) })
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setTitle(`Profil de ${target.username}`)
      .addFields(
        {
          name: '📊 Progression',
          value: [
            `**Niveau ${level}** — ${xp.toLocaleString()} / ${nextXP.toLocaleString()} XP`,
            `\`[${xpBar}]\` ${xpPct}%`,
          ].join('\n'),
          inline: false,
        },
        { name: '🪙 Coins',        value: `**${(dbUser.coins ?? 0).toLocaleString()}**`,               inline: true },
        { name: '⭐ Réputation',   value: `**${dbUser.reputation ?? 0}**`,                             inline: true },
        { name: '🔥 Streak daily', value: `**${dbUser.dailyStreak ?? 0}j**`,                           inline: true },
      );

    // Saison
    if (seasonRank > 0) {
      embed.addFields({ name: `🏆 Saison ${season}`, value: `Rang **#${seasonRank}** — ${(allSeason[seasonRank - 1]?.xp ?? 0).toLocaleString()} XP`, inline: true });
    }

    // Clan
    if (clan) {
      embed.addFields({ name: '🏴 Clan', value: `**[${clan.tag}] ${clan.name}**${clan.ownerId === target.id ? ' 👑' : ''}`, inline: true });
    }

    // AniList
    if (aniEntry) {
      embed.addFields({ name: '🎌 AniList', value: `[${aniEntry.anilistUsername}](https://anilist.co/user/${aniEntry.anilistUsername})`, inline: true });
    }

    // Badges
    if (badges.length) {
      const catalog = BadgeRepository.getCatalogFull();
      const badgeStr = badges.slice(0, 10).map(b => catalog[b.badgeKey]?.emoji ?? '🏅').join(' ');
      embed.addFields({ name: `🎖 Badges (${badges.length})`, value: badgeStr, inline: false });
    }

    // Top 3 jeux
    const topGames = Object.entries(gameStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (topGames.length) {
      const gamesStr = topGames.map(([name, secs]) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return `🎮 **${name}** — ${h}h${m}m`;
      }).join('\n');
      embed.addFields({ name: '🕹️ Jeux', value: gamesStr, inline: false });
    }

    embed.setFooter({ text: `Nexus · Profil gaming · Saison ${season}` }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};
