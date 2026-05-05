const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const embedBuilder = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aide')
    .setDescription('Affiche toutes les commandes de Nexus'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(embedBuilder.COLORS.gaming)
      .setTitle('🤖 Nexus — Toutes les commandes')
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 128 }))
      .addFields(
        {
          name: '✨ Progression',
          value: [
            '`/profil [@user]` — Voir son profil XP, niveau, temps de jeu et badges',
            '`/daily` — Bonus XP quotidien + gestion du streak',
            '`/top [limite]` — Classement XP du serveur',
            '`/badges [@user]` — Tous les badges disponibles',
          ].join('\n'),
        },
        {
          name: '🎮 Jeux & Stats',
          value: [
            '`/stats [@user]` — Détail du temps de jeu par jeu',
            '_Les sessions sont trackées automatiquement via ta présence Discord_',
          ].join('\n'),
        },
        {
          name: '⚔️ Social & Fun',
          value: [
            '`/duel @user` — Défi pierre-feuille-ciseaux (30 XP pour le gagnant)',
            '`/quiz` — Question gaming aléatoire',
          ].join('\n'),
        },
        {
          name: '📊 Communauté',
          value: [
            '`/sond <question> <opt1> <opt2> [...]` — Lance un sondage (15 XP par vote)',
          ].join('\n'),
        },
        {
          name: '🛠️ Administration',
          value: [
            '`/rappel on/off/set` — Activer/désactiver/configurer les rappels',
            '`/notif on/off` — Activer/désactiver les notifications de présence',
            '`/event start/stop` — Lancer/arrêter un événement XP x2',
            '`/ai salon/reset/statut` — Gérer le système IA',
            '`/warn add/list/clear` — Avertissements progressifs (auto-mute)',
            '`/autopost status/recap/rss/notif/rappel` — Activer/désactiver les messages automatiques',
          ].join('\n'),
        },
        {
          name: '🎌 AniList',
          value: [
            '`/register <pseudo>` — Lier ton compte AniList à Discord',
            '`/aniboard` — Classement AniList du serveur (temps de visionnage)',
          ].join('\n'),
        },
        {
          name: '🤖 IA & Recherche',
          value: [
            '`/recherche <requête>` — Recherche sur le web + résumé par Nexus',
            '**Mentionne Nexus** ou **réponds à un de ses messages** pour lui parler directement.',
            '_Le salon IA dédié se configure avec_ `/ai salon`',
          ].join('\n'),
        },
        {
          name: '🏅 Système XP',
          value: [
            '• **+5 XP/min** en jouant à un jeu (plafonné à 60/heure)',
            '• **+15 XP** par vote dans un sondage',
            '• **+10 XP** pour ton premier message de la journée',
            '• **+25 XP+** pour le bonus daily (× streak)',
            '• **+30 XP** pour gagner un duel',
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Nexus v2 · Un bot vivant pour votre communauté gaming' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
