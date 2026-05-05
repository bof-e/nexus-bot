const { SlashCommandBuilder } = require('discord.js');
const XPService = require('../../services/XPService');
const MissionRepository = require('../../database/MissionRepository');
const embedBuilder = require('../../utils/embedBuilder');

const QUESTIONS = [
  { text: 'Quel jeu a inventé le terme "Battle Royale" dans le gaming ?', answer: 'PLAYERUNKNOWN\'S BATTLEGROUNDS', aliases: ['pubg', 'battleground', 'playerunknown'] },
  { text: 'Dans Warframe, comment s\'appelle l\'entité qui guide les Tenno ?', answer: 'Lotus', aliases: ['le lotus'] },
  { text: 'Quel est le nom du protagoniste principal de Genshin Impact ?', answer: 'Voyageur', aliases: ['lumine', 'aether', 'traveler'] },
  { text: 'Dans Minecraft, combien de coeurs de vie un joueur possède-t-il au maximum ?', answer: '10', aliases: ['dix', '10 coeurs', '20 points'] },
  { text: 'Quel jeu populaire utilise la monnaie virtuelle appelée "V-Bucks" ?', answer: 'Fortnite', aliases: ['fortnite'] },
  { text: 'Dans quel jeu trouve-t-on la Plaine de Mondstadt ?', answer: 'Genshin Impact', aliases: ['genshin'] },
  { text: 'Quel studio a développé Hades et Hades 2 ?', answer: 'Supergiant Games', aliases: ['supergiant'] },
  { text: 'Combien de joueurs compose une équipe standard dans League of Legends ?', answer: '5', aliases: ['cinq'] },
  { text: 'Comment s\'appelle le système de niveau dans Warframe ?', answer: 'Mastery Rank', aliases: ['mr', 'mastery'] },
  { text: 'Dans Wuthering Waves, quel est le nom de la protagoniste par défaut ?', answer: 'Rover', aliases: ['kuro'] },
  { text: 'Quel FPS Valve utilise le moteur Source 2 ?', answer: 'Counter-Strike 2', aliases: ['cs2', 'counter strike 2'] },
  { text: 'Dans quel jeu open-world Bethesda peut-on être "Dovahkiin" ?', answer: 'Skyrim', aliases: ['the elder scrolls', 'tes5'] },
  { text: 'Quel est le nom du dieu de la guerre dans God of War 2018 ?', answer: 'Kratos', aliases: ['kratos'] },
  { text: 'Quel personnage de Nintendo est plombier et sauve la princesse ?', answer: 'Mario', aliases: ['super mario', 'mario bros'] },
  { text: 'Dans quel jeu doit-on "catch\'em all" ?', answer: 'Pokémon', aliases: ['pokemon'] },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Lance une question gaming — 30 secondes pour répondre !'),

  async execute(interaction) {
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const timeoutSec = 30;

    const embed = embedBuilder.quiz(question, timeoutSec);
    await interaction.reply({ embeds: [embed] });

    // Collecteur de messages dans le canal
    const filter = m => !m.author.bot;
    const collector = interaction.channel.createMessageCollector({
      filter,
      time: timeoutSec * 1000,
    });

    let answered = false;
    collector.on('collect', async (msg) => {
      if (answered) return;
      const answer = msg.content.toLowerCase().trim();
      const correct = [
        question.answer.toLowerCase(),
        ...(question.aliases || []).map(a => a.toLowerCase()),
      ].some(a => answer.includes(a));

      if (correct) {
        answered = true;
        collector.stop('answered');

        const xp = 20;
        await XPService.addXP(msg.author.id, msg.author.username, xp, interaction.guild);
        await msg.reply({
          embeds: [embedBuilder.success(
            'Bonne réponse !',
            `🎉 <@${msg.author.id}> a trouvé ! La réponse était **${question.answer}**.\n**+${xp} XP** gagné !`
          )],
        });
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'answered') return;
      await interaction.followUp({
        embeds: [embedBuilder.error(
          'Temps écoulé !',
          `⏰ Personne n'a trouvé. La réponse était **${question.answer}**.`
        )],
      });
    });
  },
};
