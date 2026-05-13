const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const UserRepository = require('../../database/UserRepository');
const embedBuilder   = require('../../utils/embedBuilder');

const FACES = ['🪙 Face', '🦅 Pile'];
const COOLDOWN_MS = 30_000;
const _cd = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Pile ou face — parie tes coins (ou joue gratuitement)')
    .addStringOption(o => o.setName('choix').setDescription('Ton pari').setRequired(true)
      .addChoices({ name: '🪙 Face', value: 'face' }, { name: '🦅 Pile', value: 'pile' }))
    .addIntegerOption(o => o.setName('mise').setDescription('Coins à miser (0 = gratuit)').setMinValue(0).setMaxValue(5000).setRequired(false)),

  async execute(interaction) {
    // Cooldown 30s
    const last = _cd.get(interaction.user.id) || 0;
    if (Date.now() - last < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
      return interaction.reply({ embeds: [embedBuilder.error('Cooldown', `Encore **${remaining}s** avant de relancer.`)], flags: MessageFlags.Ephemeral });
    }

    const choix = interaction.options.getString('choix');
    const mise  = interaction.options.getInteger('mise') ?? 0;

    // Vérifier les fonds si mise
    if (mise > 0) {
      const user = await UserRepository.findOrCreate(interaction.user.id, interaction.user.username);
      if ((user.coins ?? 0) < mise) {
        return interaction.reply({ embeds: [embedBuilder.error('Fonds insuffisants', `Tu n'as que **${user.coins ?? 0} 🪙**.`)], flags: MessageFlags.Ephemeral });
      }
    }

    await interaction.deferReply();
    _cd.set(interaction.user.id, Date.now());

    // Animation de suspense
    const suspense = await interaction.editReply({ content: '🪙 La pièce tourne dans les airs...' });

    await new Promise(r => setTimeout(r, 1500));

    // Résultat aléatoire
    const result  = Math.random() < 0.5 ? 'face' : 'pile';
    const resultLabel = result === 'face' ? '🪙 Face' : '🦅 Pile';
    const win     = choix === result;

    let gainText = '';
    if (mise > 0) {
      if (win) {
        await UserRepository.addCoins(interaction.user.id, mise);
        gainText = `\n💰 Tu remportes **+${mise} 🪙** !`;
      } else {
        await UserRepository.spendCoins(interaction.user.id, mise);
        gainText = `\n💸 Tu perds **-${mise} 🪙**.`;
      }
    }

    const embed = embedBuilder.base(win ? 0x2ecc71 : 0xe74c3c)
      .setTitle(win ? '✅ Tu as gagné !' : '❌ Tu as perdu !')
      .setDescription([
        `La pièce est tombée sur **${resultLabel}**`,
        `Tu avais choisi **${choix === 'face' ? '🪙 Face' : '🦅 Pile'}**`,
        gainText,
      ].filter(Boolean).join('\n'))
      .setFooter({ text: 'Nexus · Coinflip' });

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
