const { SlashCommandBuilder } = require('discord.js');
const MissionRepository = require('../../database/MissionRepository');
const embedBuilder      = require('../../utils/embedBuilder');
const { progressBar }   = require('../../utils/levelCalc');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('missions')
    .setDescription('Affiche tes missions du jour et de la semaine'),

  async execute(interaction) {
    await interaction.deferReply();

    const missions = await MissionRepository.getUserMissions(interaction.user.id);
    const daily    = missions.filter(m => m.type === 'daily');
    const weekly   = missions.filter(m => m.type === 'weekly');

    const fmt = (m) => {
      const bar   = progressBar(Math.min(100, Math.floor((m.progress / m.goal) * 100)), 8);
      const state = m.completed ? '✅' : `\`${bar}\` ${m.progress}/${m.goal}`;
      return `**${m.name}** — ${m.desc}\n┗ ${state} · 🏅 +${m.xp}XP · 🪙 +${m.coins}`;
    };

    const dailyDone   = daily.filter(m => m.completed).length;
    const weeklyDone  = weekly.filter(m => m.completed).length;

    const embed = embedBuilder.base(0xF5A623)
      .setTitle(`🎯 Missions de ${interaction.user.username}`)
      .addFields(
        {
          name: `📅 Quotidiennes (${dailyDone}/${daily.length})`,
          value: daily.map(fmt).join('\n\n') || '_Aucune_',
        },
        {
          name: `📆 Hebdomadaires (${weeklyDone}/${weekly.length})`,
          value: weekly.map(fmt).join('\n\n') || '_Aucune_',
        }
      )
      .setFooter({ text: 'Nexus · Missions — Récompenses automatiques à la complétion' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
