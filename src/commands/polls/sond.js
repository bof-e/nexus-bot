const { SlashCommandBuilder } = require('discord.js');
const PollRepository = require('../../database/PollRepository');
const XPService = require('../../services/XPService');
const BadgeRepository = require('../../database/BadgeRepository');
const UserRepository = require('../../database/UserRepository');
const embedBuilder = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sond')
    .setDescription('Lance un sondage dans ce salon')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('La question du sondage')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true).setMaxLength(100))
    .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true).setMaxLength(100))
    .addStringOption(opt => opt.setName('option3').setDescription('Option 3').setRequired(false).setMaxLength(100))
    .addStringOption(opt => opt.setName('option4').setDescription('Option 4').setRequired(false).setMaxLength(100))
    .addStringOption(opt => opt.setName('option5').setDescription('Option 5').setRequired(false).setMaxLength(100))
    .addStringOption(opt => opt.setName('option6').setDescription('Option 6').setRequired(false).setMaxLength(100))
    .addStringOption(opt => opt.setName('option7').setDescription('Option 7').setRequired(false).setMaxLength(100))
    .addStringOption(opt => opt.setName('option8').setDescription('Option 8').setRequired(false).setMaxLength(100))
    .addIntegerOption(opt =>
      opt.setName('duree')
        .setDescription('Durée en heures (défaut 24h, max 168h)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(168)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const dureeH = Math.min(interaction.options.getInteger('duree') ?? 24, 168);

    const options = [];
    for (let i = 1; i <= 8; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const endTime = Date.now() + dureeH * 3600000;
    const timeLabel = `Expire dans ${dureeH}h — <t:${Math.floor(endTime / 1000)}:R>`;

    const embed = embedBuilder.poll(question, options, timeLabel);
    await interaction.reply({ embeds: [embed] });

    const reply = await interaction.fetchReply();

    // Réactions numérotées
    for (let i = 0; i < options.length; i++) {
      await reply.react(embedBuilder.numberEmoji(i)).catch(() => {});
    }

    await PollRepository.save(reply.id, interaction.channelId, question, options, endTime);

    // BUG FIX: XP pour création de sondage (pas pour "voter") — label corrigé
    await XPService.addXP(
      interaction.user.id,
      interaction.user.username,
      config.xp.voteInPoll,
      interaction.guild
    );

    // Collecteur de votes (XP aux votants)
    const collector = reply.createReactionCollector({
      time: dureeH * 3600000,
      filter: (reaction, user) => !user.bot,
    });

    const votedUsers = new Set();
    collector.on('collect', async (reaction, user) => {
      if (votedUsers.has(user.id)) return;
      votedUsers.add(user.id);

      // XP pour vote
      await UserRepository.findOrCreate(user.id, user.username);
      await XPService.addXP(user.id, user.username, config.xp.voteInPoll, interaction.guild);

      // BUG FIX: on utilisait directement User.updateOne() en bypassant le repository
      const dbUser = await UserRepository.incrementVoteCount(user.id);
      const voteCount = dbUser?.voteCount || 0;

      // Badges de vote
      if (voteCount >= 10) await BadgeRepository.award(user.id, 'voter');
      if (voteCount >= 50) await BadgeRepository.award(user.id, 'democrat');
    });
  },
};
