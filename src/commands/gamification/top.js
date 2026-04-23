const { SlashCommandBuilder } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const embedBuilder = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Affiche le classement XP du serveur')
    .addIntegerOption(opt =>
      opt.setName('limite')
        .setDescription('Nombre de membres (défaut 10, max 15)')
        .setRequired(false)
        .setMinValue(3)
        .setMaxValue(15)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const limit = Math.min(interaction.options.getInteger('limite') ?? 10, 15);
    const entries = UserRepository.topByXP(limit);

    const embed = embedBuilder.leaderboard(entries, interaction.guild.name);
    await interaction.editReply({ embeds: [embed] });
  },
};
