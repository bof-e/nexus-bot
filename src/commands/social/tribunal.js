const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const AIService      = require('../../services/AIService');
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

    // BUG FIX: l'heuristique basée sur les mentions était peu fiable et pouvait
    // pénaliser le mauvais joueur. On cherche maintenant des mots-clés explicites
    // ("tort", "raison", le nom du perdant) dans le verdict de l'IA.
    let winnerId  = null;
    let loserId   = null;
    let penaltyMsg = '';

    const verdictLower = verdict.toLowerCase();
    const plaignantName = interaction.user.username.toLowerCase();
    const defendeurName = adversaire.username.toLowerCase();

    // Chercher qui a "tort" dans le verdict
    const tortIdx    = verdictLower.indexOf('tort');
    const raisonIdx  = verdictLower.indexOf('raison');
    const perdantIdx = verdictLower.indexOf('perdant');

    if (tortIdx !== -1) {
      // Trouver quel joueur est mentionné le plus près de "tort"
      const plaignantBeforeTort = verdictLower.lastIndexOf(plaignantName, tortIdx);
      const defendeurBeforeTort = verdictLower.lastIndexOf(defendeurName, tortIdx);
      if (plaignantBeforeTort > defendeurBeforeTort && plaignantBeforeTort !== -1) {
        loserId  = interaction.user.id;
        winnerId = adversaire.id;
      } else if (defendeurBeforeTort > plaignantBeforeTort && defendeurBeforeTort !== -1) {
        loserId  = adversaire.id;
        winnerId = interaction.user.id;
      }
    } else if (raisonIdx !== -1) {
      // Trouver qui a "raison"
      const plaignantBeforeRaison = verdictLower.lastIndexOf(plaignantName, raisonIdx);
      const defendeurBeforeRaison = verdictLower.lastIndexOf(defendeurName, raisonIdx);
      if (plaignantBeforeRaison > defendeurBeforeRaison && plaignantBeforeRaison !== -1) {
        winnerId = interaction.user.id;
        loserId  = adversaire.id;
      } else if (defendeurBeforeRaison > plaignantBeforeRaison && defendeurBeforeRaison !== -1) {
        winnerId = adversaire.id;
        loserId  = interaction.user.id;
      }
    }

    if (winnerId && loserId) {
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
