const { SlashCommandBuilder } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const embedBuilder   = require('../../utils/embedBuilder');
const { levelFromXP, xpForNextLevel, rankName } = require('../../utils/levelCalc');

// Affiche les 5 prochains niveaux avec l'XP requis
module.exports = {
  data: new SlashCommandBuilder()
    .setName('niveau')
    .setDescription('Affiche ta progression et la roadmap des prochains niveaux'),

  async execute(interaction) {
    await interaction.deferReply();
    const user   = await UserRepository.findOrCreate(interaction.user.id, interaction.user.username);
    const xp     = user.xp || 0;
    const level  = levelFromXP(xp);
    const nextXP = xpForNextLevel(level);
    const pct    = Math.min(100, Math.floor((xp / nextXP) * 100));
    const bar    = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));

    // Générer les 5 prochains niveaux
    const MILESTONE_BADGES = { 5: '🥉', 15: '🥈', 30: '🥇' };
    const MILESTONE_ROLES  = { 5: 'Rookie', 15: 'Vétéran', 30: 'Légende' };

    const roadmap = [];
    for (let lvl = level + 1; lvl <= level + 5; lvl++) {
      const needed  = xpForNextLevel(lvl - 1);
      const rank    = rankName(lvl);
      const badge   = MILESTONE_BADGES[lvl] ? ` ${MILESTONE_BADGES[lvl]} Badge + Rôle **${MILESTONE_ROLES[lvl]}**` : '';
      roadmap.push(`**Niv. ${lvl}** — ${needed.toLocaleString()} XP · *${rank}*${badge}`);
    }

    const embed = embedBuilder.base(0xF5A623)
      .setTitle(`📈 Progression de ${interaction.user.username}`)
      .addFields(
        {
          name: `Niveau actuel : **${level}** — *${rankName(level)}*`,
          value: [
            `${xp.toLocaleString()} / ${nextXP.toLocaleString()} XP`,
            `\`[${bar}]\` ${pct}%`,
            `Il te manque **${(nextXP - xp).toLocaleString()} XP** pour le niveau ${level + 1}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '🗺️ Prochains niveaux',
          value: roadmap.join('\n'),
          inline: false,
        },
        {
          name: '⚡ Comment gagner de l\'XP',
          value: [
            '💬 Message dans le chat → XP automatique',
            '🎮 Jouer à un jeu → XP par minute',
            '📅 `/daily` → bonus quotidien + streak',
            '⚔️ `/duel` → XP au vainqueur',
            '🧠 `/quiz` → XP si bonne réponse',
            '🎯 Missions → XP à la complétion',
          ].join('\n'),
          inline: false,
        }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
      .setFooter({ text: 'Nexus · Progression' });

    await interaction.editReply({ embeds: [embed] });
  },
};
