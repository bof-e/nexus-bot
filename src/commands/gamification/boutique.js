const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const Purchase       = require('../../database/models/Purchase');
const embedBuilder   = require('../../utils/embedBuilder');
const config         = require('../../../config');
const logger         = require('../../utils/logger');

// ─── Catalogue de la boutique ────────────────────────────────────────────────
// type: 'role' | 'xp' | 'coins_boost' | 'cosmetic'
const SHOP = {
  xp_boost_small: {
    key: 'xp_boost_small', name: '⚡ Boost XP (x2 / 1h)',
    desc: 'Double ton XP pendant 1 heure',
    price: 150, type: 'xp_boost', duration: 3600_000, multiplier: 2,
    once: false,
  },
  xp_boost_big: {
    key: 'xp_boost_big', name: '🚀 Mega Boost XP (x3 / 1h)',
    desc: 'Triple ton XP pendant 1 heure',
    price: 350, type: 'xp_boost', duration: 3600_000, multiplier: 3,
    once: false,
  },
  role_vip: {
    key: 'role_vip', name: '👑 Rôle VIP',
    desc: 'Obtiens le rôle VIP permanent sur le serveur',
    price: 500, type: 'role', roleKey: 'vip',
    once: true,
  },
  rep_boost: {
    key: 'rep_boost', name: '⭐ +5 Réputation',
    desc: 'Augmente ta réputation de 5 points',
    price: 100, type: 'reputation', amount: 5,
    once: false,
  },
  daily_reset: {
    key: 'daily_reset', name: '🔄 Reset Daily',
    desc: 'Réinitialise ton cooldown /daily immédiatement',
    price: 200, type: 'daily_reset',
    once: false,
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Dépense tes 🪙 coins dans la boutique')
    .addSubcommand(sub =>
      sub.setName('voir').setDescription('Voir les articles disponibles')
    )
    .addSubcommand(sub =>
      sub.setName('acheter')
        .setDescription('Acheter un article')
        .addStringOption(opt =>
          opt.setName('article')
            .setDescription('ID de l\'article à acheter')
            .setRequired(true)
            .addChoices(...Object.values(SHOP).map(i => ({ name: i.name, value: i.key })))
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── /boutique voir ───────────────────────────────────────────────────────
    if (sub === 'voir') {
      await interaction.deferReply();
      const user    = await UserRepository.findOrCreate(interaction.user.id, interaction.user.username);
      const balance = user.coins ?? 0;

      const lines = await Promise.all(Object.values(SHOP).map(async item => {
        const bought = item.once && await Purchase.exists({ discordId: interaction.user.id, itemKey: item.key });
        const canBuy = !bought && balance >= item.price;
        const status = bought ? '_(possédé)_' : canBuy ? '✅' : '❌';
        return `**${item.name}** — ${item.desc}\n┗ 🪙 **${item.price}** coins · ${status} · \`${item.key}\``;
      }));

      const embed = embedBuilder.base(0xFFD700)
        .setTitle('🛒 Boutique Nexus')
        .setDescription(`Ton solde : **🪙 ${balance} coins**\n\n` + lines.join('\n\n'))
        .setFooter({ text: 'Utilise /boutique acheter <article> pour acheter' });

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /boutique acheter ────────────────────────────────────────────────────
    if (sub === 'acheter') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const itemKey = interaction.options.getString('article');
      const item    = SHOP[itemKey];

      if (!item) {
        return interaction.editReply({ embeds: [embedBuilder.error('Article introuvable', 'Cet article n\'existe pas.')] });
      }

      // Article unique déjà possédé
      if (item.once && await Purchase.exists({ discordId: interaction.user.id, itemKey })) {
        return interaction.editReply({ embeds: [embedBuilder.error('Déjà possédé', 'Tu as déjà cet article.')] });
      }

      // Débit des coins
      const result = await UserRepository.spendCoins(interaction.user.id, item.price);
      if (!result.success) {
        return interaction.editReply({
          embeds: [embedBuilder.error(
            'Fonds insuffisants',
            `Il te manque **${item.price - result.balance} coins**. Solde actuel : 🪙 **${result.balance}**`
          )],
        });
      }

      // Application de l'effet
      let effectMsg = '';
      try {
        if (item.type === 'xp_boost') {
          const expiry = Date.now() + item.duration;
          await UserRepository.setSetting(`xp_boost_${interaction.user.id}`, JSON.stringify({ multiplier: item.multiplier, expiry }));
          effectMsg = `Ton XP est multiplié par **${item.multiplier}** pendant 1 heure !`;
        }
        else if (item.type === 'role') {
          const roleId = config.roles[item.roleKey];
          if (roleId) {
            const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            const role   = interaction.guild.roles.cache.get(roleId);
            if (member && role) await member.roles.add(role);
          }
          effectMsg = `Le rôle **${item.name}** t'a été attribué !`;
        }
        else if (item.type === 'reputation') {
          const newRep = await UserRepository.addReputation(interaction.user.id, item.amount);
          effectMsg = `+${item.amount} réputation ! Tu es maintenant à **${newRep}** ⭐`;
        }
        else if (item.type === 'daily_reset') {
          await UserRepository.updateDailyStreak(interaction.user.id, 0, 0);
          effectMsg = 'Ton cooldown /daily a été réinitialisé. Bonne pioche !';
        }

        // Enregistrement de l'achat
        if (item.once) await Purchase.create({ discordId: interaction.user.id, itemKey });

        // Shadow badge Baleine : tracker les coins dépensés aujourd'hui
        const today = new Date().toISOString().slice(0, 10);
        const spendKey = interaction.user.id + ':' + today;
        const todaySpend = (_dailySpend.get(spendKey) || 0) + item.price;
        _dailySpend.set(spendKey, todaySpend);
        await ShadowBadgeService.onPurchase(interaction.user.id, todaySpend).catch(() => {});

        logger.info(`[Boutique] ${interaction.user.tag} a acheté ${itemKey}`);
      } catch (e) {
        // Remboursement si l'effet a échoué
        await UserRepository.addCoins(interaction.user.id, item.price);
        logger.error(`[Boutique] Erreur lors de l'application de ${itemKey} : ${e.message}`);
        return interaction.editReply({ embeds: [embedBuilder.error('Erreur', 'L\'achat a échoué, tu as été remboursé.')] });
      }

      return interaction.editReply({
        embeds: [embedBuilder.success(
          `${item.name} acheté !`,
          `${effectMsg}\n\n🪙 Solde restant : **${result.balance} coins**`
        )],
      });
    }
  },
};
