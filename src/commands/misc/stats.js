const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GameRepository = require('../../database/GameRepository');
const UserRepository = require('../../database/UserRepository');
const embedBuilder = require('../../utils/embedBuilder');
const { levelFromXP, rankName } = require('../../utils/levelCalc');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche les statistiques de temps de jeu d\'un membre')
    .addUserOption(opt =>
      opt.setName('utilisateur')
        .setDescription('Membre à afficher (toi par défaut)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur') ?? interaction.user;
    await interaction.deferReply();

    const gameStats = await GameRepository.getUserGameStats(target.id);
    const dbUser = await UserRepository.findOrCreate(target.id, target.username);
    const entries = Object.entries(gameStats).sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
      return interaction.editReply({
        embeds: [embedBuilder.error('Aucune donnée', `**${target.username}** n'a pas encore de sessions enregistrées.`)],
      });
    }

    const totalSeconds = entries.reduce((acc, [, s]) => acc + s, 0);
    const totalH = Math.floor(totalSeconds / 3600);
    const totalM = Math.floor((totalSeconds % 3600) / 60);

    const lines = entries.map(([game, secs], i) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const pct = Math.round((secs / totalSeconds) * 100);
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      const medal = ['🥇', '🥈', '🥉'][i] || '▫️';
      return `${medal} **${game}**\n\`${bar}\` ${pct}% — ${h}h ${m}m`;
    });

    const embed = new EmbedBuilder()
      .setColor(embedBuilder.COLORS.gaming)
      .setTitle(`🎮 Stats de jeu — ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 64 }))
      .setDescription(lines.join('\n\n'))
      .addFields({
        name: '⏱️ Total',
        value: `**${totalH}h ${totalM}m** sur **${entries.length}** jeu${entries.length > 1 ? 'x' : ''}`,
        inline: false,
      })
      .setFooter({ text: `Nexus · Niveau ${levelFromXP(dbUser.xp)} — ${rankName(levelFromXP(dbUser.xp))}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
