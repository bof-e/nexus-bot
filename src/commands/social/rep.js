const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const embedBuilder   = require('../../utils/embedBuilder');

// Cooldown en mémoire : 1 rep par cible par 24h par utilisateur
const _repCooldowns = new Map();
const REP_CD = 24 * 3600_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Donne un point de réputation à un membre (1 fois / 24h par cible)')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à récompenser').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('membre');

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [embedBuilder.error('Rep', 'Tu ne peux pas te rep toi-même.')], flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [embedBuilder.error('Rep', 'Les bots n\'ont pas besoin de réputation.')], flags: MessageFlags.Ephemeral });
    }

    const cdKey = `${interaction.user.id}:${target.id}`;
    const last  = _repCooldowns.get(cdKey) || 0;
    const diff  = Date.now() - last;

    if (diff < REP_CD) {
      const remaining = Math.ceil((REP_CD - diff) / 3600_000);
      return interaction.reply({
        embeds: [embedBuilder.error('Cooldown', `Tu as déjà rep <@${target.id}> récemment. Réessaie dans **${remaining}h**`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    _repCooldowns.set(cdKey, Date.now());
    const newRep = await UserRepository.addReputation(target.id, 1);

    return interaction.reply({
      embeds: [embedBuilder.success(
        '⭐ Réputation donnée',
        `<@${interaction.user.id}> a donné +1 réputation à <@${target.id}>.\n`
        + `<@${target.id}> est maintenant à **${newRep} ⭐**`
      )],
    });
  },
};
