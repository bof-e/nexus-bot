const { SlashCommandBuilder } = require('discord.js');
const AniListRepository = require('../../database/AniListRepository');
const embedBuilder      = require('../../utils/embedBuilder');

const ANILIST_API = 'https://graphql.anilist.co';

// Requête GraphQL — récupère les stats de visionnage d'un utilisateur.
const STATS_QUERY = `
  query ($name: String) {
    User(name: $name) {
      name
      siteUrl
      avatar { medium }
      statistics {
        anime {
          minutesWatched
          episodesWatched
          count
        }
      }
    }
  }
`;

/**
 * Interroge AniList pour un utilisateur et retourne ses stats.
 * Retourne null si l'utilisateur n'existe plus ou si l'API échoue.
 */
async function fetchStats(anilistUsername) {
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: STATS_QUERY, variables: { name: anilistUsername } }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (json.errors || !json.data?.User) return null;

    const stats = json.data.User.statistics?.anime ?? {};
    return {
      username:        json.data.User.name,
      siteUrl:         json.data.User.siteUrl,
      minutesWatched:  stats.minutesWatched  ?? 0,
      episodesWatched: stats.episodesWatched ?? 0,
      completed:       stats.count           ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Interroge AniList pour plusieurs utilisateurs en parallèle,
 * en respectant un délai entre les appels pour éviter le rate-limit.
 */
async function fetchAllStats(entries) {
  const DELAY_MS = 600; // AniList rate-limit : ~90 req/min
  const results  = [];

  for (const entry of entries) {
    const stats = await fetchStats(entry.anilistUsername);
    if (stats) {
      results.push({ discordId: entry.discordId, ...stats });
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return results;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aniboard')
    .setDescription('Classement AniList des membres du serveur 🎌'),

  async execute(interaction) {
    await interaction.deferReply();

    // 1. Récupérer les membres enregistrés
    const entries = await AniListRepository.findAll();

    if (!entries.length) {
      return interaction.editReply({
        embeds: [embedBuilder.error(
          'Aucun membre enregistré',
          'Personne n\'a encore lié son compte AniList.\nUtilise `/register <pseudo_anilist>` pour commencer !'
        )],
      });
    }

    // 2. Informer l'utilisateur que ça peut prendre du temps
    if (entries.length > 3) {
      await interaction.editReply({
        content: `⏳ Récupération des stats pour **${entries.length}** membres… (quelques secondes)`,
      });
    }

    // 3. Récupérer les stats de chaque membre
    const stats = await fetchAllStats(entries);

    if (!stats.length) {
      return interaction.editReply({
        embeds: [embedBuilder.error(
          'Données indisponibles',
          'Impossible de récupérer les stats AniList. L\'API est peut-être temporairement indisponible.'
        )],
      });
    }

    // 4. Trier du plus grand temps de visionnage au plus petit
    stats.sort((a, b) => b.minutesWatched - a.minutesWatched);

    // 5. Construire et envoyer l'embed
    const embed = embedBuilder.aniboard(stats, interaction.guild.name);
    return interaction.editReply({ content: null, embeds: [embed] });
  },
};
