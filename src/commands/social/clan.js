const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ClanRepository = require('../../database/ClanRepository');
const UserRepository = require('../../database/UserRepository');
const embedBuilder   = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Système de clans — crée et rejoins des équipes')
    .addSubcommand(s => s.setName('creer')
      .setDescription('Créer un clan')
      .addStringOption(o => o.setName('nom').setDescription('Nom du clan (max 30 chars)').setRequired(true).setMaxLength(30))
      .addStringOption(o => o.setName('tag').setDescription('Tag court [2-5 lettres]').setRequired(true).setMinLength(2).setMaxLength(5))
      .addStringOption(o => o.setName('description').setDescription('Description').setRequired(false).setMaxLength(150))
    )
    .addSubcommand(s => s.setName('rejoindre')
      .setDescription('Rejoindre un clan existant')
      .addStringOption(o => o.setName('tag').setDescription('Tag du clan').setRequired(true))
    )
    .addSubcommand(s => s.setName('quitter').setDescription('Quitter ton clan actuel'))
    .addSubcommand(s => s.setName('info')
      .setDescription('Voir les infos d\'un clan')
      .addStringOption(o => o.setName('tag').setDescription('Tag du clan (ton clan si vide)').setRequired(false))
    )
    .addSubcommand(s => s.setName('top').setDescription('Classement des clans par XP'))
    .addSubcommand(s => s.setName('dissoudre').setDescription('Dissoudre ton clan (chef uniquement)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── creer ──────────────────────────────────────────────────────────────
    if (sub === 'creer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const existing = await ClanRepository.findByMember(interaction.user.id);
      if (existing) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Tu es déjà dans un clan. Quitte-le d\'abord.')] });

      const nom  = interaction.options.getString('nom');
      const tag  = interaction.options.getString('tag').toUpperCase();
      const desc = interaction.options.getString('description') || '';

      if (await ClanRepository.findByTag(tag)) return interaction.editReply({ embeds: [embedBuilder.error('Clan', `Le tag **[${tag}]** est déjà pris.`)] });
      if (await ClanRepository.findByName(nom))  return interaction.editReply({ embeds: [embedBuilder.error('Clan', `Le nom **${nom}** est déjà pris.`)] });

      const clan = await ClanRepository.create(interaction.user.id, nom, tag, desc);
      return interaction.editReply({
        embeds: [embedBuilder.success('Clan créé !', `Ton clan **[${clan.tag}] ${clan.name}** est prêt. Dis à tes amis de faire \`/clan rejoindre ${clan.tag}\` !`)],
      });
    }

    // ── rejoindre ──────────────────────────────────────────────────────────
    if (sub === 'rejoindre') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const already = await ClanRepository.findByMember(interaction.user.id);
      if (already) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Tu es déjà dans un clan.')] });

      const tag  = interaction.options.getString('tag').toUpperCase();
      const clan = await ClanRepository.findByTag(tag);
      if (!clan) return interaction.editReply({ embeds: [embedBuilder.error('Clan', `Aucun clan avec le tag **[${tag}]**.`)] });

      await ClanRepository.join(clan._id, interaction.user.id);
      return interaction.editReply({ embeds: [embedBuilder.success('Clan rejoint !', `Bienvenue dans **[${clan.tag}] ${clan.name}** ! 🎉`)] });
    }

    // ── quitter ────────────────────────────────────────────────────────────
    if (sub === 'quitter') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const clan = await ClanRepository.findByMember(interaction.user.id);
      if (!clan) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Tu n\'es dans aucun clan.')] });
      if (clan.ownerId === interaction.user.id) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Tu es chef du clan. Utilise `/clan dissoudre` ou transfère la direction.')] });

      await ClanRepository.leave(clan._id, interaction.user.id);
      return interaction.editReply({ embeds: [embedBuilder.success('Clan quitté', `Tu as quitté **[${clan.tag}] ${clan.name}**.`)] });
    }

    // ── info ───────────────────────────────────────────────────────────────
    if (sub === 'info') {
      await interaction.deferReply();
      const tag  = interaction.options.getString('tag');
      const clan = tag
        ? await ClanRepository.findByTag(tag.toUpperCase())
        : await ClanRepository.findByMember(interaction.user.id);

      if (!clan) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Clan introuvable.')] });

      const memberList = clan.members.slice(0, 15).map(id => `<@${id}>`).join(', ');
      return interaction.editReply({
        embeds: [embedBuilder.base(0x9b59b6)
          .setTitle(`🏴 Clan [${clan.tag}] ${clan.name}`)
          .setDescription(clan.description || '_Pas de description_')
          .addFields(
            { name: '👑 Chef',     value: `<@${clan.ownerId}>`, inline: true },
            { name: '👥 Membres',  value: `${clan.members.length}`,             inline: true },
            { name: '⭐ XP total', value: clan.xpTotal.toLocaleString(),        inline: true },
            { name: '🎖 Équipe',   value: memberList || '_Aucun_',              inline: false },
          )
          .setFooter({ text: `Créé le ${new Date(clan.createdAt).toLocaleDateString('fr-FR')}` })],
      });
    }

    // ── top ────────────────────────────────────────────────────────────────
    if (sub === 'top') {
      await interaction.deferReply();
      const clans = await ClanRepository.top(10);
      const MEDALS = ['🥇','🥈','🥉'];
      const lines = clans.map((c, i) =>
        `${MEDALS[i] || `**${i+1}.**`} **[${c.tag}] ${c.name}** — ⭐ ${c.xpTotal.toLocaleString()} XP · 👥 ${c.members.length} membres`
      );
      return interaction.editReply({
        embeds: [embedBuilder.base(0x9b59b6).setTitle('🏆 Classement des Clans').setDescription(lines.join('\n') || '_Aucun clan_')],
      });
    }

    // ── dissoudre ──────────────────────────────────────────────────────────
    if (sub === 'dissoudre') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const clan = await ClanRepository.findByMember(interaction.user.id);
      if (!clan) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Tu n\'as pas de clan.')] });
      if (clan.ownerId !== interaction.user.id) return interaction.editReply({ embeds: [embedBuilder.error('Clan', 'Seul le chef peut dissoudre le clan.')] });

      await ClanRepository.delete(clan._id);
      return interaction.editReply({ embeds: [embedBuilder.success('Clan dissous', `**[${clan.tag}] ${clan.name}** a été dissous.`)] });
    }
  },
};
