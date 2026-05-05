const { SlashCommandBuilder } = require('discord.js');
const WebSearchService = require('../../services/WebSearchService');
const AIService        = require('../../services/AIService');
const embedBuilder     = require('../../utils/embedBuilder');
const logger           = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recherche')
    .setDescription('Nexus cherche sur le web et te donne un résumé direct.')
    .addStringOption(opt =>
      opt.setName('requête')
        .setDescription('Ce que tu veux chercher')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(200)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString('requête').trim();

    // 1. Recherche web
    let results = [];
    try {
      results = await WebSearchService.search(query, 5);
    } catch (e) {
      logger.warn(`[/recherche] Erreur WebSearch : ${e.message}`);
    }

    if (!results.length) {
      return interaction.editReply({
        embeds: [embedBuilder.error(
          'Aucun résultat',
          `Pas grand-chose sur **"${query}"**. Soit c'est trop niche, soit Internet est en PLS.`
        )],
      });
    }

    // 2. Résumé IA si disponible
    let summary = null;
    if (AIService.enabled) {
      try {
        const resultsText = results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
          .join('\n\n');

        const prompt =
          `L'utilisateur a cherché : "${query}"\n\n`
          + `Résultats de recherche :\n${resultsText}\n\n`
          + `Synthétise ces résultats en 2-3 phrases max. Reste en personnage (rival compétitif, punchlines courtes). `
          + `Ne liste pas les sources, fais un vrai résumé utile.`;

        // On utilise un canal fictif pour ne pas polluer l'historique du vrai canal
        summary = await AIService.respond(`search_${interaction.channelId}`, prompt, {
          username: interaction.user.username,
        });
      } catch (e) {
        logger.warn(`[/recherche] Résumé IA échoué : ${e.message}`);
      }
    }

    // 3. Construction de l'embed
    const embed = embedBuilder.base(0x4A90D9)
      .setTitle(`🔍 Recherche : ${query.length > 50 ? query.slice(0, 47) + '…' : query}`)
      .setFooter({ text: 'Nexus · Web Search · Les sources peuvent varier' });

    if (summary) {
      embed.setDescription(`> ${summary.replace(/\n/g, '\n> ')}`);
    }

    // Liens sources
    const links = results
      .filter(r => r.url)
      .slice(0, 5)
      .map((r, i) => `**${i + 1}.** [${r.title.slice(0, 60)}${r.title.length > 60 ? '…' : ''}](${r.url})`)
      .join('\n');

    if (links) {
      embed.addFields({ name: '📎 Sources', value: links });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
