const XPService  = require('../services/XPService');
const AIService  = require('../services/AIService');
const config     = require('../../config');
const logger             = require('../utils/logger');
const ShadowBadgeService    = require('../services/ShadowBadgeService');
const EmojiStockRepository  = require('../database/EmojiStockRepository');

// Nettoie le texte : retire les mentions, les balises de réponse Discord, les espaces superflus.
function cleanContent(message, clientId) {
  return message.content
    .replace(new RegExp(`<@!?${clientId}>`, 'g'), '')
    .trim()
    || message.cleanContent.replace(new RegExp(`@${message.guild?.members?.me?.displayName || 'Nexus'}`, 'gi'), '').trim();
}

// Détermine si le message s'adresse au bot.
function shouldRespond(message, client) {
  const { author, mentions, reference, channel } = message;

  // 1. Mention directe
  if (mentions.users.has(client.user.id)) return true;

  // 2. Réponse à un message du bot
  if (reference?.messageId) {
    // On récupère depuis le cache — si absent on ne bloque pas
    const replied = channel.messages?.cache?.get(reference.messageId);
    if (replied?.author?.id === client.user.id) return true;
    // Sans cache, on vérifie via l'API
    // (géré en async dans execute pour éviter de bloquer)
    return 'FETCH_NEEDED';
  }

  // 3. Salon IA dédié
  const aiChannel = config.channels.ai;
  if (aiChannel && channel.id === aiChannel) return true;

  return false;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ── Tracking emojis pour la Bourse ───────────────────────────────
    const emojiMatches = message.content.matchAll(/<a?:([\w]+):(\d+)>/g);
    for (const m of emojiMatches) {
      EmojiStockRepository.recordUsage(m[2], m[1]).catch(() => {});
    }

    // ── XP sur message (inchangé) ─────────────────────────────────────
    try {
      await XPService.tryAddMessageXP(message.author.id, message.author.username);
    } catch (e) {
      logger.debug(`[Message] XP erreur : ${e.message}`);
    }

    // ── Réponse IA ───────────────────────────────────────────────────
    if (!AIService.enabled) return;

    let trigger = shouldRespond(message, client);

    // Cas où il faut vérifier le message référencé via l'API
    if (trigger === 'FETCH_NEEDED') {
      try {
        const replied = await message.channel.messages.fetch(message.reference.messageId);
        trigger = replied?.author?.id === client.user.id;
      } catch {
        trigger = false;
      }
    }

    if (!trigger) return;

    // Rate-limit par canal
    if (!AIService.canRespond(message.channel.id)) return;

    // Shadow badge : fantôme (retour après absence)
    await ShadowBadgeService.onReturnAfterSilence(message.author.id).catch(() => {});
    ShadowBadgeService.updateLastSeen(message.author.id);

    const userText = cleanContent(message, client.user.id);
    if (!userText || userText.length < 1) return;

    // Indicateur de frappe pendant la génération
    await message.channel.sendTyping().catch(() => {});

    // Contexte enrichi : jeu actuel de l'utilisateur si dispo
    const presence = message.member?.presence;
    const game     = presence?.activities?.find(a => a.type === 0)?.name || null;

    const context = {
      username:   message.author.username,
      serverName: message.guild.name,
      game,
    };

    const reply = await AIService.respond(message.channel.id, userText, context, message.author.id);
    if (reply) await ShadowBadgeService.onAIInteraction(message.author.id).catch(() => {});
    if (!reply) return;

    // Répondre en thread du message original pour garder la lisibilité
    await message.reply({ content: reply, allowedMentions: { repliedUser: false } })
      .catch(err => logger.warn(`[AI] Envoi impossible : ${err.message}`));
  },
};
