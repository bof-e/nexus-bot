const AIConversation = require('./models/AIConversation');

const MAX_HISTORY = 12; // messages conservés par canal (6 échanges)

class AIConversationRepository {
  /**
   * Récupère l'historique d'un canal sous forme de tableau
   * compatible avec l'API Gemini : [{ role, parts: [{ text }] }].
   */
  async getHistory(channelId) {
    const doc = await AIConversation.findOne({ channelId });
    if (!doc) return [];
    return doc.messages.map(m => ({
      role:  m.role,
      parts: [{ text: m.content }],
    }));
  }

  /**
   * Ajoute un échange (user + model) et tronque si nécessaire.
   */
  async push(channelId, userText, modelText) {
    const newMessages = [
      { role: 'user',  content: userText  },
      { role: 'model', content: modelText },
    ];

    await AIConversation.findOneAndUpdate(
      { channelId },
      {
        $push:  { messages: { $each: newMessages } },
        $set:   { updatedAt: new Date() },
      },
      { upsert: true }
    );

    // Garde uniquement les MAX_HISTORY derniers messages
    await AIConversation.findOneAndUpdate(
      { channelId },
      {
        $push: {
          messages: {
            $each: [],
            $slice: -MAX_HISTORY,
          },
        },
      }
    );
  }

  /**
   * Remet l'historique d'un canal à zéro.
   */
  async clear(channelId) {
    await AIConversation.deleteOne({ channelId });
  }

  /**
   * Supprime tous les historiques du bot (nettoyage global).
   */
  async clearAll() {
    return AIConversation.deleteMany({});
  }
}

module.exports = new AIConversationRepository();
