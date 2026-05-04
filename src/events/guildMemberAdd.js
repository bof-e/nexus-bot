const UserRepository = require('../database/UserRepository');
const randomResponses = require('../utils/randomResponses');
const embedBuilder = require('../utils/embedBuilder');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    await UserRepository.findOrCreate(member.user.id, member.user.username);

    const msg = randomResponses.get('welcome', null, { user: member.user.username });
    logger.info(`[Welcome] ${member.user.tag} a rejoint le serveur`);

    // Message dans le canal système du serveur si disponible
    const systemChannel = member.guild.systemChannel;
    if (systemChannel?.isTextBased()) {
      const welcomeEmbed = embedBuilder.welcome(member.user, 0);
      await systemChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
    }

    // DM d'accueil
    try {
      const dmEmbed = embedBuilder.welcome(member.user, 0);
      await member.user.send({ embeds: [dmEmbed] });
    } catch (e) {
      // DMs désactivés — pas bloquant
      logger.debug(`[Welcome] DM impossible pour ${member.user.tag}`);
    }
  },
};
