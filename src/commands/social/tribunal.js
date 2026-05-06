const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const AIService      = require('../../services/AIService');
const WarnRepository = require('../../database/WarnRepository');
const UserRepository = require('../../database/UserRepository');
const embedBuilder   = require('../../utils/embedBuilder');

// Cooldown : un seul tribunal actif par canal pendant 5 minutes
const _cooldowns = new Map();
const TRIBUNAL_CD = 5 * 60_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tribunal')
    .setDescription('⚖️ L\'IA tranche un désaccord — verdict définitif, sans appel')
    .addUserOption(o => o.setName('adversaire').setDescription('La personne en face de toi').setRequired(true))
    .addStringOption(o => o.setName('litige').setDescription('Le sujet du désaccord (max 200 chars)').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('ton_argument').setDescription('Ton argument principal').setRequired(true).setMaxLength(300))
    .addStringOption(o => o.setName('argument_adverse').setDescription('L\'argument de ton adversaire').setRequired(true).setMaxLength(300)),

  async execute(interaction) {
    const adversaire  = interaction.options.getUser('adversaire');
    const litige      = interaction.options.getString('litige');
    const argPlaignant= interaction.options.getString('ton_argument');
    const argDefendeur= interaction.options.getString('argument_adverse');

    if (adversaire.id === interaction.user.id) {
      return interaction.reply({ embeds: [embedBuilder.error('Tribunal', 'Tu ne peux pas te poursuivre toi-même. Cherche un vrai adversaire.')], flags: MessageFlags.Ephemeral });
    }
    if (adversaire.bot) {
      return interaction.reply({ embeds: [embedBuilder.error('Tribunal', 'Les bots sont au-dessus des lois. Pour l\'instant.')], flags: MessageFlags.Ephemeral });
    }

    const cdKey = interaction.channelId;
    if (Date.now() - (_cooldowns.get(cdKey) || 0) < TRIBUNAL_CD) {
      return interaction.reply({ embeds: [embedBuilder.error('Tribunal', 'Un tribunal vient de se tenir ici. Laissez le juge souffler 5 minutes.')], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();
    _cooldowns.set(cdKey, Date.now());

    const prompt = `
Tu es le Juge Nexus — magistrat impartial, légèrement sarcastique, redouté de tous.
Un litige t'a été soumis. Tu dois rendre un VERDICT DÉFINITIF.

LITIGE : "${litige}"

PLAIGNANT : <@${interaction.user.id}> — "${interaction.user.username}"
Argument : "${argPlaignant}"

DÉFENDEUR : <@${adversaire.id}> — "${adversaire.username}"
Argument : "${argDefendeur}"

RENDU UN VERDICT en 4 parties :
1. ANALYSE des deux arguments (2-3 phrases max, impartial)
2. VERDICT : qui a tort, qui a raison — et pourquoi (direct, sans pitié)
3. SENTENCE pour le perdant (créative mais non offensante — amende symbolique en coins, avertissement symbolique, ou tâche absurde)
4. MOT DE LA FIN : une punchline de juge épuisé par les bêtises humaines

Format : reste en personnage jusqu'au bout. Réponds en français.
`.trim();

    let verdict = await AIService.respond(`tribunal_${interaction.channelId}`, prompt, {
      username: 'Tribunal',
      serverName: interaction.guild.name,
    });

    if (!verdict) {
      verdict = 'Le tribunal est en délibération… et le juge s\'est endormi. Revenez plus tard.';
    }

    // Déterminer un "gagnant" symbolique en cherchant les noms dans le verdict
    const mentionsPlaignant = (verdict.match(new RegExp(interaction.user.username, 'gi')) || []).length;
    const mentionsDefendeur = (verdict.match(new RegExp(adversaire.username, 'gi')) || []).length;

    let winnerId  = null;
    let loserId   = null;
    let penaltyMsg = '';

    if (mentionsPlaignant !== mentionsDefendeur) {
      // Heuristique simple : celui le moins mentionné dans les reproches perd moins
      const winnerGuess = verdict.toLowerCase().includes('raison') && verdict.toLowerCase().indexOf(interaction.user.username.toLowerCase()) < verdict.toLowerCase().indexOf('raison')
        ? interaction.user.id : adversaire.id;
      winnerId = winnerGuess;
      loserId  = winnerGuess === interaction.user.id ? adversaire.id : interaction.user.id;

      // Amende symbolique de 50 coins du perdant vers le gagnant
      try {
        const result = await UserRepository.spendCoins(loserId, 50);
        if (result.success) {
          await UserRepository.addCoins(winnerId, 50);
          penaltyMsg = '\n\n💸 **Amende exécutée** : 50 🪙 ont été transférés du perdant au gagnant.';
        }
      } catch {}
    }

    return interaction.editReply({
      embeds: [embedBuilder.base(0x8E44AD)
        .setTitle('⚖️ VERDICT DU TRIBUNAL NEXUS')
        .setDescription('**Litige :** ' + litige + '\n\n' + verdict + penaltyMsg)
        .addFields(
          { name: '🧑‍💼 Plaignant', value: '<@' + interaction.user.id + '>', inline: true },
          { name: '🧑‍💼 Défendeur', value: '<@' + adversaire.id + '>',      inline: true },
        )
        .setFooter({ text: 'Verdict définitif. L\'appel n\'existe pas ici.' })
        .setTimestamp()],
    });
  },
};
