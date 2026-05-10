const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const SeasonRepository = require('../../database/SeasonRepository');
const embedBuilder     = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saison')
    .setDescription('Système de saisons XP')
    .addSubcommand(s => s.setName('info').setDescription('Infos sur la saison en cours + ton rang'))
    .addSubcommand(s => s.setName('top').setDescription('Classement de la saison en cours'))
    .addSubcommand(s => s.setName('historique')
      .setDescription('Classement d\'une saison passée')
      .addIntegerOption(o => o.setName('numero').setDescription('Numéro de saison').setRequired(true).setMinValue(1))
    )
    .addSubcommand(s => s.setName('terminer')
      .setDescription('Terminer la saison et reset les XP (Admin)')
    ),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const season = await SeasonRepository.getCurrentSeason();
    const start  = await SeasonRepository.getSeasonStart();

    if (sub === 'info') {
      await interaction.deferReply();
      const stat = await SeasonRepository.getUserStat(season, interaction.user.id);
      // Snapshot pour avoir le rang actuel
      await SeasonRepository.snapshot(season);
      const updatedStat = await SeasonRepository.getUserStat(season, interaction.user.id);
      const all = await SeasonRepository.getLeaderboard(season, 500);
      const rank = all.findIndex(s => s.discordId === interaction.user.id) + 1;

      return interaction.editReply({
        embeds: [embedBuilder.base(0xf1c40f)
          .setTitle(`🏆 Saison ${season} en cours`)
          .setDescription(`Débutée le <t:${Math.floor(start/1000)}:D>`)
          .addFields(
            { name: '📊 Ton XP cette saison', value: `**${(updatedStat?.xp ?? 0).toLocaleString()}**`, inline: true },
            { name: '🏅 Ton rang',            value: rank ? `**#${rank}**` : '_Non classé_',            inline: true },
            { name: '👥 Participants',         value: `**${all.length}**`,                                inline: true },
          )
          .setFooter({ text: 'Les saisons resetent les XP et sont archivées. /saison top pour le classement.' })],
      });
    }

    if (sub === 'top') {
      await interaction.deferReply();
      await SeasonRepository.snapshot(season);
      const entries = await SeasonRepository.getLeaderboard(season, 10);
      const MEDALS  = ['🥇','🥈','🥉'];
      const lines   = entries.map((e, i) =>
        `${MEDALS[i] || `**${i+1}.**`} <@${e.discordId}> — **${e.xp.toLocaleString()} XP**`
      );
      return interaction.editReply({
        embeds: [embedBuilder.base(0xf1c40f)
          .setTitle(`🏆 Classement — Saison ${season}`)
          .setDescription(lines.join('\n') || '_Aucune donnée_')
          .setFooter({ text: 'Snapshot en temps réel · /saison info pour ton rang' })],
      });
    }

    if (sub === 'historique') {
      await interaction.deferReply();
      const num     = interaction.options.getInteger('numero');
      if (num >= season) return interaction.editReply({ embeds: [embedBuilder.error('Saison', 'Cette saison n\'est pas encore terminée.')] });
      const entries = await SeasonRepository.getLeaderboard(num, 10);
      if (!entries.length) return interaction.editReply({ embeds: [embedBuilder.error('Saison', 'Aucune donnée pour cette saison.')] });
      const MEDALS = ['🥇','🥈','🥉'];
      const lines  = entries.map((e, i) =>
        `${MEDALS[i] || `**${i+1}.**`} **${e.username}** — **${e.xp.toLocaleString()} XP** _(rank final #${e.finalRank})_`
      );
      return interaction.editReply({
        embeds: [embedBuilder.base(0x95a5a6).setTitle(`📜 Archives — Saison ${num}`).setDescription(lines.join('\n'))],
      });
    }

    if (sub === 'terminer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!interaction.memberPermissions?.has('Administrator')) {
        return interaction.editReply({ embeds: [embedBuilder.error('Permission refusée', 'Cette commande est réservée aux administrateurs.')] });
      }
      const podium = await SeasonRepository.endSeason(season);
      const newSeason = season + 1;

      const podiumText = podium.map((e, i) => {
        const medals = ['🥇','🥈','🥉'];
        return `${medals[i]} **${e.username}** — ${e.xp.toLocaleString()} XP`;
      }).join('\n');

      // Annoncer dans le canal de recap si configuré
      try {
        const config  = require('../../../../config');
        const ch = await interaction.client.channels.fetch(config.channels.recap).catch(() => null);
        if (ch?.isTextBased()) {
          await ch.send({
            embeds: [embedBuilder.base(0xf1c40f)
              .setTitle(`🏆 Fin de la Saison ${season} !`)
              .setDescription(`La saison **${season}** est terminée ! Les XP ont été remis à zéro.\n\n**🏅 Podium final :**\n${podiumText}\n\nBonne chance pour la **Saison ${newSeason}** !`)],
          });
        }
      } catch {}

      return interaction.editReply({
        embeds: [embedBuilder.success(
          `Saison ${season} terminée`,
          `**Podium :**\n${podiumText}\n\n✅ XP remis à zéro. Saison ${newSeason} commencée.`
        )],
      });
    }
  },
};
