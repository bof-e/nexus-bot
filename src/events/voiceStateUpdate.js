const { PermissionFlagsBits, ChannelType } = require('discord.js');
const ClanRepository      = require('../database/ClanRepository');
const VoiceTerritory      = require('../database/models/VoiceTerritory');
const logger              = require('../utils/logger');

// Map des salons temporaires : channelId → { ownerId, clanId? }
const tempChannels = new Map();

// Suivi du temps vocal par clan : channelId → { clanId, startTs, memberCount }
const _voiceTracking = new Map();

// Bonus XP de clan par minute de contrôle territorial
const TERRITORY_XP_PER_MIN = 2;

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guild = newState.guild || oldState.guild;

    // ── 1. Création automatique de salon temporaire (Hub) ─────────────────
    const hubChannelId = process.env.VOICE_HUB_CHANNEL_ID;
    if (hubChannelId && newState.channelId === hubChannelId && newState.member) {
      try {
        const member = newState.member;
        const parent = newState.channel?.parentId ?? null;
        const clan   = await ClanRepository.findByMember(member.id).catch(() => null);
        const name   = clan ? `[${clan.tag}] ${member.displayName}` : `🎮 ${member.displayName}`;

        const tempChannel = await guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          parent,
          permissionOverwrites: [
            { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers] },
            { id: guild.id,  allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          ],
          userLimit: 10,
        });

        await member.voice.setChannel(tempChannel);
        tempChannels.set(tempChannel.id, { ownerId: member.id, clanId: clan?._id?.toString() ?? null });
        logger.info('[Voice] Salon temporaire créé : ' + tempChannel.name);
      } catch (e) {
        logger.warn('[Voice] Création salon temp impossible : ' + e.message);
      }
    }

    // ── 2. Suppression quand le salon se vide ─────────────────────────────
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
      const channel = oldState.channel;
      if (channel && channel.members.size === 0) {
        try {
          await channel.delete('Salon temporaire vide');
          tempChannels.delete(oldState.channelId);
          _voiceTracking.delete(oldState.channelId);
          logger.info('[Voice] Salon temporaire supprimé : ' + channel.name);
        } catch (e) {
          logger.warn('[Voice] Suppression impossible : ' + e.message);
        }
      }
    }

    // ── 3. Capture de territoire — suivi du clan dominant ─────────────────
    const channelId = newState.channelId || oldState.channelId;
    const channel   = newState.channel || oldState.channel;
    if (!channel || !tempChannels.has(channelId)) return;

    try {
      await _updateTerritory(guild, channel, channelId);
    } catch (e) {
      logger.debug('[Voice] Territory update erreur : ' + e.message);
    }
  },
};

async function _updateTerritory(guild, channel, channelId) {
  // Compter les membres par clan dans le salon
  const clanCounts = new Map();
  for (const [, member] of channel.members) {
    if (member.user.bot) continue;
    const clan = await ClanRepository.findByMember(member.id).catch(() => null);
    if (!clan) continue;
    const clanKey = clan._id.toString();
    clanCounts.set(clanKey, { clan, count: (clanCounts.get(clanKey)?.count ?? 0) + 1 });
  }

  if (!clanCounts.size) {
    _voiceTracking.delete(channelId);
    return;
  }

  // Le clan dominant = celui avec le plus de membres
  let dominant = null;
  let maxCount = 0;
  for (const [key, data] of clanCounts) {
    if (data.count > maxCount) { maxCount = data.count; dominant = data.clan; }
  }
  if (!dominant) return;

  const prev = _voiceTracking.get(channelId);
  const now  = Date.now();

  if (prev && prev.clanId === dominant._id.toString()) {
    // Même clan — calculer les minutes écoulées et donner XP
    const minutesElapsed = Math.floor((now - prev.startTs) / 60_000);
    if (minutesElapsed > 0) {
      const xpGain = minutesElapsed * TERRITORY_XP_PER_MIN;
      await ClanRepository.addXP(dominant._id, xpGain);
      _voiceTracking.set(channelId, { clanId: dominant._id.toString(), startTs: now });

      // Mettre à jour ou créer l'entrée de territoire
      await VoiceTerritory.findOneAndUpdate(
        { channelId },
        {
          clanId:   dominant._id.toString(),
          clanName: dominant.name,
          clanTag:  dominant.tag,
          $inc: { minutesHeld: minutesElapsed },
        },
        { upsert: true }
      );

      logger.debug('[Voice] Territoire : [' + dominant.tag + '] tient ' + channelId + ' (+' + xpGain + ' XP clan)');
    }
  } else {
    // Nouveau clan dominant — capture !
    const previousTerritory = await VoiceTerritory.findOne({ channelId });
    const wasCaptured = previousTerritory && previousTerritory.clanId !== dominant._id.toString();

    _voiceTracking.set(channelId, { clanId: dominant._id.toString(), startTs: now });

    await VoiceTerritory.findOneAndUpdate(
      { channelId },
      { clanId: dominant._id.toString(), clanName: dominant.name, clanTag: dominant.tag, capturedAt: new Date() },
      { upsert: true }
    );

    if (wasCaptured) {
      // Renommer le salon pour afficher le clan capturant
      try {
        await channel.setName('[' + dominant.tag + '] Territoire', 'Capture de territoire');
        logger.info('[Voice] 🏴 Territoire capturé par [' + dominant.tag + '] dans ' + channelId);
      } catch {}
    }
  }
}
