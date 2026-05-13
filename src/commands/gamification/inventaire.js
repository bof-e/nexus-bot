const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const Purchase     = require('../../database/models/Purchase');
const UserRepository = require('../../database/UserRepository');
const embedBuilder = require('../../utils/embedBuilder');

const ITEM_LABELS = {
  xp_boost_small:  '⚡ Boost XP ×2 (1h)',
  xp_boost_big:    '🚀 Mega Boost XP ×3 (1h)',
  role_vip:        '👑 Rôle VIP',
  rep_boost:       '⭐ +5 Réputation',
  daily_reset:     '🔄 Reset Daily',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Tes achats en boutique et boost XP actif'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const [user, purchases] = await Promise.all([
      UserRepository.findOrCreate(interaction.user.id, interaction.user.username),
      Purchase.find({ discordId: interaction.user.id }).sort({ boughtAt: -1 }).limit(15),
    ]);

    // Boost XP actif ?
    const boostRaw = await UserRepository.getSetting('xp_boost_' + interaction.user.id);
    let boostField = '_Aucun boost actif_';
    if (boostRaw) {
      try {
        const boost = JSON.parse(boostRaw);
        if (boost?.expiry > Date.now()) {
          const remaining = Math.ceil((boost.expiry - Date.now()) / 60_000);
          boostField = `🚀 **×${boost.multiplier}** actif — encore **${remaining} min**`;
        }
      } catch {}
    }

    const embed = embedBuilder.base(0xFFD700)
      .setTitle(`🎒 Inventaire de ${interaction.user.username}`)
      .addFields(
        { name: '🪙 Solde actuel', value: `**${(user.coins ?? 0).toLocaleString()} coins**`, inline: true },
        { name: '⚡ Boost XP',     value: boostField,                                         inline: true },
      );

    if (!purchases.length) {
      embed.addFields({ name: '🛒 Historique', value: '_Aucun achat pour l\'instant. `/boutique voir` pour commencer !_' });
    } else {
      const lines = purchases.map(p => {
        const label = ITEM_LABELS[p.itemKey] ?? p.itemKey;
        const date  = new Date(p.boughtAt).toLocaleDateString('fr-FR');
        return `• ${label} — *${date}*`;
      });
      embed.addFields({ name: `🛒 Historique (${purchases.length})`, value: lines.join('\n') });
    }

    embed.setFooter({ text: 'Nexus · Inventaire · /boutique pour acheter' });
    await interaction.editReply({ embeds: [embed] });
  },
};
