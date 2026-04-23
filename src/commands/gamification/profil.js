const { SlashCommandBuilder } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const GameRepository = require('../../database/GameRepository');
const BadgeRepository = require('../../database/BadgeRepository');
const embedBuilder = require('../../utils/embedBuilder');

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

    const dbUser = UserRepository.findOrCreate(target.id, target.username);
    const gameStats = GameRepository.getUserGameStats(target.id);
    const badges = BadgeRepository.getUserBadges(target.id);

    const embed = embedBuilder.profile(target, dbUser, gameStats, badges);
    await interaction.editReply({ embeds: [embed] });
  },
};
