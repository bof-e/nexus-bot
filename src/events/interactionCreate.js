const embedBuilder = require('../utils/embedBuilder');
const CooldownManager = require('../services/CooldownManager');
const config = require('../../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) {
      logger.warn(`[Interaction] Commande inconnue : ${interaction.commandName}`);
      return interaction.reply({ embeds: [embedBuilder.error('Commande inconnue', 'Cette commande n\'existe pas.')], ephemeral: true });
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
          ephemeral: true,
        });
      }
    }

    try {
      await command.execute(interaction, client);
      if (cooldownSecs) CooldownManager.set(interaction.commandName, interaction.user.id);
    } catch (error) {
      logger.error(`[Interaction] Erreur commande /${interaction.commandName} par ${interaction.user.tag}: ${error.stack}`);

      const errEmbed = embedBuilder.error(
        'Erreur inattendue',
        'Une erreur est survenue. Si le problème persiste, contacte un administrateur.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      } catch (e) {
        logger.error(`[Interaction] Impossible de répondre à l'erreur : ${e.message}`);
      }
    }
  },
};
