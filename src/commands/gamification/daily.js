const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const XPService = require("../../services/XPService");
const embedBuilder = require("../../utils/embedBuilder");
const randomResponses = require("../../utils/randomResponses");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Réclame ton bonus XP quotidien et maintiens ton streak !"),

  async execute(interaction) {
    // On defer car claimDaily fait plusieurs appels DB (UserRepository, MissionRepository, etc.)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

    try {
      const result = await XPService.claimDaily(interaction.user.id, interaction.user.username);

      if (!result.success) {
        const hours = Math.floor(result.remaining / 3600000);
        const minutes = Math.floor((result.remaining % 3600000) / 60000);
        return interaction.editReply({
          embeds: [embedBuilder.error(
            "Déjà réclamé",
            `Tu as déjà pris ton bonus aujourd'hui !\n⏰ Prochain bonus dans **${hours}h ${minutes}m**`
          )]
        });
      }

      const msg = randomResponses.get("dailyClaimed", null, {
        user: interaction.user.username,
        xp: result.xp,
        streak: result.streak,
      });

      const embed = embedBuilder.success("Bonus quotidien !", msg)
        .addFields({ name: "🔥 Streak", value: `${result.streak} jour${result.streak > 1 ? "s" : ""} consécutif${result.streak > 1 ? "s" : ""}`, inline: true });

      if (result.newBadges?.length) {
        embed.addFields({
          name: "🏅 Nouveaux badges",
          value: result.newBadges.map(b => `${b.emoji} **${b.name}** — ${b.desc}`).join("\n"),
        });
      }

      // Level-up events depuis la pipeline XP complète
      if (result.events?.length) {
        const levelUps = result.events.filter(e => e.type === "levelUp");
        if (levelUps.length) {
          const lvl = levelUps[levelUps.length - 1];
          embed.addFields({ name: "⬆️ Niveau supérieur !", value: `Tu es passé niveau **${lvl.level}** — *${lvl.rank}*`, inline: false });
        }
        const badgeEvents = result.events.filter(e => e.type === "badge");
        if (badgeEvents.length) {
          const existing = embed.data.fields?.find(f => f.name === "🏅 Nouveaux badges");
          const lines = badgeEvents.map(e => `${e.badge.emoji} **${e.badge.name}** — ${e.badge.desc}`);
          if (existing) existing.value += "\n" + lines.join("\n");
          else embed.addFields({ name: "🏅 Nouveaux badges", value: lines.join("\n") });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(`[Daily] Erreur execution : ${err.message}`);
      return interaction.editReply({ content: "Une erreur est survenue lors de la récupération de votre bonus." }).catch(() => {});
    }
  },
};
