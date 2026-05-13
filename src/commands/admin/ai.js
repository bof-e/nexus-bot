const { SlashCommandBuilder,
  PermissionFlagsBits, MessageFlags } = require('discord.js');
const AIConversationRepository = require('../../database/AIConversationRepository');
const UserRepository           = require('../../database/UserRepository');
const AIService                = require('../../services/AIService');
const embedBuilder             = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Gestion du système IA de Nexus (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // Sous-commande : définir le salon IA
    .addSubcommand(sub =>
      sub.setName('salon')
        .setDescription('Définit le salon dédié où Nexus répond à tous les messages.')
        .addChannelOption(opt =>
          opt.setName('canal')
            .setDescription('Laisse vide pour désactiver le salon dédié.')
            .setRequired(false)
        )
    )

    // Sous-commande : effacer l'historique
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Efface l\'historique de conversation IA d\'un salon (ou de tous).')
        .addStringOption(opt =>
          opt.setName('portée')
            .setDescription('Canal actuel ou tous les canaux ?')
            .setRequired(true)
            .addChoices(
              { name: 'Ce salon uniquement', value: 'channel' },
              { name: 'Tout le serveur',     value: 'all'     }
            )
        )
    )

    // Sous-commande : statut du système IA
    .addSubcommand(sub =>
      sub.setName('statut')
        .setDescription('Affiche l\'état du système IA et des services connectés.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    // ── /ai salon ────────────────────────────────────────────────────
    if (sub === 'salon') {
      const canal = interaction.options.getChannel('canal');

      if (canal) {
        // Vérifier que c'est un salon textuel
        if (!canal.isTextBased()) {
          return interaction.editReply({
            embeds: [embedBuilder.error('Canal invalide', 'Le canal doit être un salon textuel.')],
          });
        }
        await UserRepository.setSetting('ai_channel', canal.id);
        // Mise à jour du config en mémoire
        const config = require('../../../config');
        config.channels.ai = canal.id;

        return interaction.editReply({
          embeds: [embedBuilder.success(
            'Salon IA configuré',
            `Nexus répondra désormais à **tous** les messages dans <#${canal.id}>.\n`
            + `Mentionne-moi n'importe où, ou réponds à un de mes messages pour me parler ailleurs.`
          )],
        });
      } else {
        await UserRepository.setSetting('ai_channel', '');
        const config = require('../../../config');
        config.channels.ai = null;

        return interaction.editReply({
          embeds: [embedBuilder.success(
            'Salon IA désactivé',
            'Le salon dédié a été retiré. Nexus répond toujours aux mentions et réponses directes.'
          )],
        });
      }
    }

    // ── /ai reset ─────────────────────────────────────────────────────
    if (sub === 'reset') {
      const scope = interaction.options.getString('portée');

      if (scope === 'channel') {
        await AIConversationRepository.clear(interaction.channelId);
        return interaction.editReply({
          embeds: [embedBuilder.success(
            'Historique effacé',
            'L\'historique de conversation de ce salon a été remis à zéro. Nexus repart de zéro ici.'
          )],
        });
      }

      if (scope === 'all') {
        const { deletedCount } = await AIConversationRepository.clearAll();
        return interaction.editReply({
          embeds: [embedBuilder.success(
            'Reset global',
            `**${deletedCount ?? '?'}** historique(s) de conversation effacé(s) sur tout le serveur.`
          )],
        });
      }
    }

    // ── /ai statut ────────────────────────────────────────────────
    if (sub === 'statut') {
      const config = require('../../../config');
      const WebSearchService = require('../../services/WebSearchService');

      // BUG FIX: geminiOk et searchBackend n'étaient pas définis dans ce scope
      const geminiOk = !!(config.ai?.geminiKey || process.env.GEMINI_API_KEY);
      let searchBackend = '❌ Aucun (DuckDuckGo fallback)';
      if (config.ai?.googleCseKey && config.ai?.googleCseId) {
        searchBackend = '✅ Google Custom Search';
      } else if (config.ai?.serpApiKey) {
        searchBackend = '✅ SerpAPI';
      } else {
        searchBackend = '⚠️ DuckDuckGo (fallback gratuit, résultats limités)';
      }

      const aiChannel = config.channels.ai
        ? `<#${config.channels.ai}>`
        : '_Non configuré_';

      const embed = embedBuilder.base(geminiOk ? 0x43B581 : 0xF04747)
        .setTitle('🤖 Statut du système IA')
        .addFields(
          { name: 'Gemini (réponses)',  value: geminiOk ? '✅ Actif (gemini-2.5-flash — 6 RPM free tier)' : '❌ Désactivé (clé manquante)', inline: true },
          { name: 'Recherche web',      value: searchBackend,                                                               inline: true },
          { name: 'Salon IA dédié',     value: aiChannel,                                                                   inline: false },
          { name: 'Triggers actifs',    value: '• Mention directe\n• Réponse à un message du bot\n• Messages dans le salon dédié', inline: false },
        )
        .setFooter({ text: 'Nexus · /ai salon pour configurer le salon dédié' });

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
