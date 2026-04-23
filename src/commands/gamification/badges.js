const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BadgeRepository = require('../../database/BadgeRepository');
const embedBuilder = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badges')
    .setDescription('Affiche tous les badges disponibles et ceux que tu as obtenus')
    .addUserOption(opt =>
      opt.setName('utilisateur')
        .setDescription('Voir les badges d\'un autre membre')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('utilisateur') ?? interaction.user;
    const earned = await BadgeRepository.getUserBadges(target.id);
    const earnedKeys = new Set(earned.map(b => b.key));
    const catalog = BadgeRepository.getCatalog();

    const categories = {
      '🎮 Temps de jeu':    ['first_hour', 'marathon', 'nocturnal'],
      '🗳️ Participation':   ['voter', 'democrat'],
      '🔥 Régularité':      ['loyal', 'addict'],
      '⚔️ Duels':           ['fighter', 'champion'],
      '✨ Niveaux':         ['lvl5', 'lvl15', 'lvl30'],
    };

    const fields = Object.entries(categories).map(([label, keys]) => {
      const lines = keys.map(k => {
        const b = catalog[k];
        const got = earnedKeys.has(k);
        return `${got ? b.emoji : '⬜'} **${b.name}** — ${b.desc}${got ? ' ✅' : ''}`;
      });
      return { name: label, value: lines.join('\n'), inline: false };
    });

    const embed = new EmbedBuilder()
      .setColor(embedBuilder.COLORS.gold)
      .setTitle(`🏅 Badges — ${target.username}`)
      .setDescription(`**${earned.length}/${Object.keys(catalog).length}** badges obtenus`)
      .addFields(fields)
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setFooter({ text: 'Nexus · Système de badges' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
