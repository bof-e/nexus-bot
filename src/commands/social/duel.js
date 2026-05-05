const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const XPService = require('../../services/XPService');
const BadgeRepository = require('../../database/BadgeRepository');
const UserRepository = require('../../database/UserRepository'); // BUG FIX: import manquant pour incrementDuelWins
const embedBuilder = require('../../utils/embedBuilder');
const randomResponses    = require('../../utils/randomResponses');
const MissionRepository  = require('../../database/MissionRepository');
const config = require('../../../config');

const CHOICES = ['🪨 Pierre', '📄 Feuille', '✂️ Ciseaux'];
const WINS = { 0: 2, 1: 0, 2: 1 }; // index qui bat qui : Pierre bat Ciseaux, etc.

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Défie un membre en pierre-feuille-ciseaux !')
    .addUserOption(opt =>
      opt.setName('adversaire')
        .setDescription('Le membre à défier')
        .setRequired(true)
    ),

  async execute(interaction) {
    const challenger = interaction.user;
    const target = interaction.options.getUser('adversaire');

    if (target.id === challenger.id) {
      return interaction.reply({ embeds: [embedBuilder.error('Duel', 'Tu ne peux pas te défier toi-même.')], flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [embedBuilder.error('Duel', 'Tu ne peux pas défier un bot.')], flags: MessageFlags.Ephemeral });
    }

    const embed = embedBuilder.duelChallenge(challenger, target);
    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();

    await msg.react('✅');

    // Attente de l'acceptation par la cible
    const acceptFilter = (reaction, user) => reaction.emoji.name === '✅' && user.id === target.id;
    try {
      await msg.awaitReactions({ filter: acceptFilter, max: 1, time: 30000, errors: ['time'] });
    } catch {
      return interaction.editReply({
        embeds: [embedBuilder.error('Duel annulé', `<@${target.id}> n'a pas accepté le défi dans les 30 secondes.`)],
      });
    }

    // Phase de choix via boutons éphémères
    const getChoiceButtons = () => new ActionRowBuilder().addComponents(
      CHOICES.map((label, i) =>
        new ButtonBuilder().setCustomId(`duel_choice_${i}`).setLabel(label).setStyle(ButtonStyle.Primary)
      )
    );

    await interaction.editReply({
      content: `⚔️ Duel en cours ! <@${challenger.id}> et <@${target.id}> choisissent...`,
      embeds: [],
    });

    // Demander le choix à chacun en DM ou ephemeral
    const getChoice = async (user) => {
      try {
        const dm = await user.send({
          content: `⚔️ **Duel contre ${user.id === challenger.id ? target.username : challenger.username}** — Choisis !`,
          components: [getChoiceButtons()],
        });

        const collected = await dm.awaitMessageComponent({
          filter: i => i.user.id === user.id && i.customId.startsWith('duel_choice_'),
          time: 20000,
        });
        await collected.update({ content: `✅ Choix enregistré !`, components: [] });
        return parseInt(collected.customId.split('_')[2]);
      } catch {
        return Math.floor(Math.random() * 3); // aléatoire si timeout/DM bloqués
      }
    };

    const [cChoice, tChoice] = await Promise.all([
      getChoice(challenger),
      getChoice(target),
    ]);

    let winner, loser;
    let resultText;

    if (cChoice === tChoice) {
      resultText = `🤝 Égalité ! Les deux joueurs ont choisi **${CHOICES[cChoice]}**. Personne ne gagne d'XP.`;
    } else if (WINS[cChoice] === tChoice) {
      winner = challenger;
      loser = target;
    } else {
      winner = target;
      loser = challenger;
    }

    // Toujours incrémenter duel_played (égalité ou pas)
    if (!winner) {
      await MissionRepository.progress(challenger.id, 'duel_played');
      await MissionRepository.progress(target.id, 'duel_played');
    }
    if (winner) {
      const xp = config.xp.winDuel;
      await XPService.addXP(winner.id, winner.username, xp, interaction.guild);

      // BUG FIX: badge fighter (1er duel) + champion (10 duels) maintenant correctement gérés
      await MissionRepository.progress(winner.id, 'duel_won');
      await MissionRepository.progress(loser.id, 'duel_played');
      await MissionRepository.progress(winner.id, 'duel_played');
      await BadgeRepository.award(winner.id, 'fighter');
      const updatedWinner = await UserRepository.incrementDuelWins(winner.id);
      const duelWins = updatedWinner?.duelWins || 0;
      if (duelWins >= 10) await BadgeRepository.award(winner.id, 'champion');

      const resultEmbed = embedBuilder.duelResult(winner, loser, CHOICES[winner.id === challenger.id ? cChoice : tChoice], CHOICES[winner.id === challenger.id ? tChoice : cChoice], xp);
      // BUG FIX: resultText était déclaré avec let mais jamais assigné dans ce bloc avant l'editReply
      const winText = randomResponses.get('duelWin', null, { winner: winner.username, loser: loser.username, xp });
      await interaction.editReply({ content: winText, embeds: [resultEmbed] });
    } else {
      await interaction.editReply({ content: resultText, embeds: [] });
    }
  },
};
