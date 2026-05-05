const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const AniListRepository = require('../../database/AniListRepository');
const embedBuilder    = require('../../utils/embedBuilder');

// Vérifie que le pseudo existe sur AniList avant de l'enregistrer.
async function fetchAniListUser(username) {
  const query = `
    query ($name: String) {
      User(name: $name) {
        id
        name
        avatar { medium }
        siteUrl
      }
    }
  `;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { name: username } }),
  });

  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();

  if (json.errors || !json.data?.User) return null;
  return json.data.User;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Associe ton compte AniList à ton profil Discord.')
    .addStringOption(opt =>
      opt.setName('pseudo_anilist')
        .setDescription('Ton pseudo exact sur AniList.co')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(50)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const username = interaction.options.getString('pseudo_anilist').trim();

    // --- Validation AniList ---
    let aniUser;
    try {
      aniUser = await fetchAniListUser(username);
    } catch {
      return interaction.editReply({
        embeds: [embedBuilder.error(
          'Erreur réseau',
          'Impossible de contacter l\'API AniList. Réessaie dans quelques secondes.'
        )],
      });
    }

    if (!aniUser) {
      return interaction.editReply({
        embeds: [embedBuilder.error(
          'Pseudo introuvable',
          `Aucun compte AniList trouvé pour **${username}**.\nVérifie l'orthographe (respect de la casse non requis).`
        )],
      });
    }

    // --- Sauvegarde ---
    await AniListRepository.register(interaction.user.id, aniUser.name);

    return interaction.editReply({
      embeds: [
        embedBuilder.success(
          'Compte lié !',
          `Ton Discord est maintenant associé à **[${aniUser.name}](${aniUser.siteUrl})** sur AniList.\n\nUtilise \`/aniboard\` pour voir le classement du serveur ! 🎌`
        ).setThumbnail(aniUser.avatar?.medium ?? null),
      ],
    });
  },
};
