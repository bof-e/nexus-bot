const { PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../utils/logger');

// Map des salons temporaires créés : channelId → ownerId
const tempChannels = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guild = newState.guild || oldState.guild;

    // ── Création automatique de salon temporaire ───────────────────────────
    // Si l'utilisateur rejoint un salon "Hub" (configurable via /autopost ou env)
    const hubChannelId = process.env.VOICE_HUB_CHANNEL_ID;
    if (hubChannelId && newState.channelId === hubChannelId && newState.member) {
      try {
        const member  = newState.member;
        const parent  = newState.channel?.parentId ?? null;

        const tempChannel = await guild.channels.create({
          name:                 `🎮 ${member.displayName}`,
          type:                 ChannelType.GuildVoice,
          parent,
          permissionOverwrites: [
            {
              id:    member.id,
              allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers],
            },
            {
              id:    guild.id,
              allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            },
          ],
          userLimit: 10,
        });

        await member.voice.setChannel(tempChannel);
        tempChannels.set(tempChannel.id, member.id);
        logger.info(`[Voice] Salon temporaire créé : ${tempChannel.name} pour ${member.user.tag}`);
      } catch (e) {
        logger.warn(`[Voice] Impossible de créer le salon temp : ${e.message}`);
      }
    }

    // ── Suppression automatique quand le salon se vide ────────────────────
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
      const channel = oldState.channel;
      if (channel && channel.members.size === 0) {
        try {
          await channel.delete('Salon temporaire vide');
          tempChannels.delete(oldState.channelId);
          logger.info(`[Voice] Salon temporaire supprimé : ${channel.name}`);
        } catch (e) {
          logger.warn(`[Voice] Impossible de supprimer le salon : ${e.message}`);
        }
      }
    }
  },
};
