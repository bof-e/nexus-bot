const embedBuilder        = require('../utils/embedBuilder');
const { MessageFlags }    = require('discord.js');
const lfgCommand          = require('../commands/social/lfg');
const suggestionCommand   = require('../commands/social/suggestion');
const CooldownManager = require('../services/CooldownManager');
const config = require('../../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ── Boutons ──────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id.startsWith('lfg_'))  return lfgCommand.handleButton(interaction);
      if (id.startsWith('sugg_')) return suggestionCommand.handleButton(interaction);
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) {
      logger.warn(`[Interaction] Commande inconnue : ${interaction.commandName}`);
      return interaction.reply({ 
        embeds: [embedBuilder.error('Commande inconnue', 'Cette commande n\'existe pas.')], 
        flags: MessageFlags.Ephemeral 
      }).catch(() => {});
    }

    // Vérification du cooldown
    const cooldownSecs = config.cooldowns[interaction.commandName];
    if (cooldownSecs) {
      const { onCooldown, remaining } = CooldownManager.isOnCooldown(
        interaction.commandName,
        interaction.user.id,
        cooldownSecs
      );
      if (onCooldown) {
        return interaction.reply({
          embeds: [embedBuilder.error(
            'Cooldown',
            `Cette commande est en cooldown. Réessaie dans **${remaining}s**.`
          )],
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }

    try {
      // Exécution de la commande
      await command.execute(interaction, client);
      
      // On ne définit le cooldown que si la commande a réussi
      if (cooldownSecs) CooldownManager.set(interaction.commandName, interaction.user.id);
    } catch (error) {
      // Si l'interaction a déjà été répondue (Unknown interaction / Already acknowledged),
      // on évite de tenter une réponse qui ferait crasher le bot.
      if (error.code === 10062 || error.code === 40060) {
        logger.warn(`[Interaction] Erreur Discord ignorée (timeout/conflit) sur /${interaction.commandName}`);
        return;
      }

      logger.error(`[Interaction] Erreur commande /${interaction.commandName} par ${interaction.user.tag}: ${error.stack}`);

      const errEmbed = embedBuilder.error(
        'Erreur inattendue',
        'Une erreur est survenue. Si le problème persiste, contacte un administrateur.'
      );

      try {
        // Gestion sécurisée de la réponse d'erreur
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        // On ne loggue plus l'erreur de réponse si c'est un problème d'interaction déjà traitée
        if (e.code !== 10062 && e.code !== 40060) {
          logger.error(`[Interaction] Impossible de répondre à l'erreur : ${e.message}`);
        }
      }
    }
  },
};
