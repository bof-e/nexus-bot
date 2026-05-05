const MissionProgress = require('./models/MissionProgress');

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue de missions
// type: 'daily' | 'weekly'
// trigger: clé utilisée dans MissionService.progress() pour identifier l'action
// goal: nombre d'actions requis
// xp/coins: récompenses à la complétion
// ─────────────────────────────────────────────────────────────────────────────
const MISSIONS = {
  // ── Quotidiennes ────────────────────────────────────────────────────────
  daily_message: {
    key: 'daily_message', type: 'daily',
    name: '📝 Bavard du jour',
    desc: 'Envoie 5 messages dans les salons',
    trigger: 'message', goal: 5,
    xp: 20, coins: 10,
  },
  daily_daily: {
    key: 'daily_daily', type: 'daily',
    name: '📅 Discipline',
    desc: 'Réclame ton bonus quotidien',
    trigger: 'daily', goal: 1,
    xp: 15, coins: 15,
  },
  daily_duel: {
    key: 'daily_duel', type: 'daily',
    name: '⚔️ Duelliste',
    desc: 'Participe à 1 duel (win ou lose)',
    trigger: 'duel_played', goal: 1,
    xp: 25, coins: 20,
  },
  daily_quiz: {
    key: 'daily_quiz', type: 'daily',
    name: '🧠 Culture G',
    desc: 'Réponds à 1 question de quiz',
    trigger: 'quiz_answered', goal: 1,
    xp: 20, coins: 15,
  },

  // ── Hebdomadaires ────────────────────────────────────────────────────────
  weekly_messages: {
    key: 'weekly_messages', type: 'weekly',
    name: '💬 Communautaire',
    desc: 'Envoie 50 messages dans la semaine',
    trigger: 'message', goal: 50,
    xp: 100, coins: 75,
  },
  weekly_duel_win: {
    key: 'weekly_duel_win', type: 'weekly',
    name: '🏆 Guerrier',
    desc: 'Gagne 3 duels cette semaine',
    trigger: 'duel_won', goal: 3,
    xp: 150, coins: 100,
  },
  weekly_streak: {
    key: 'weekly_streak', type: 'weekly',
    name: '🔥 Régularité',
    desc: 'Maintiens un streak de 7 jours',
    trigger: 'streak_7', goal: 1,
    xp: 200, coins: 150,
  },
  weekly_game: {
    key: 'weekly_game', type: 'weekly',
    name: '🎮 Gamer',
    desc: 'Joue 2h de jeu total cette semaine',
    trigger: 'game_minutes', goal: 120,
    xp: 120, coins: 80,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de période
// ─────────────────────────────────────────────────────────────────────────────
function getDailyKey()  {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function getWeeklyKey() {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - start) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}
function periodKey(type) { return type === 'daily' ? getDailyKey() : getWeeklyKey(); }

class MissionRepository {
  getCatalog()  { return MISSIONS; }
  getDailyList()  { return Object.values(MISSIONS).filter(m => m.type === 'daily'); }
  getWeeklyList() { return Object.values(MISSIONS).filter(m => m.type === 'weekly'); }

  /**
   * Incrémente la progression d'une mission pour un trigger donné.
   * Retourne { mission, completed: bool, alreadyDone: bool } pour chaque mission touchée.
   */
  async progress(discordId, trigger, amount = 1) {
    const results = [];
    const concerned = Object.values(MISSIONS).filter(m => m.trigger === trigger);

    for (const mission of concerned) {
      const pKey = periodKey(mission.type);
      const doc = await MissionProgress.findOneAndUpdate(
        { discordId, missionKey: mission.key, periodKey: pKey },
        { $setOnInsert: { progress: 0, completed: false } },
        { upsert: true, new: true }
      );

      if (doc.completed) { results.push({ mission, completed: false, alreadyDone: true }); continue; }

      const updated = await MissionProgress.findOneAndUpdate(
        { discordId, missionKey: mission.key, periodKey: pKey, completed: false },
        { $inc: { progress: amount } },
        { new: true }
      );
      if (!updated) continue;

      if (updated.progress >= mission.goal) {
        await MissionProgress.updateOne(
          { _id: updated._id },
          { completed: true, claimedAt: Date.now() }
        );
        results.push({ mission, completed: true, alreadyDone: false });
      } else {
        results.push({ mission, completed: false, alreadyDone: false });
      }
    }
    return results;
  }

  /**
   * Retourne toutes les missions d'un utilisateur pour la période en cours.
   */
  async getUserMissions(discordId) {
    const daily  = getDailyKey();
    const weekly = getWeeklyKey();

    const progresses = await MissionProgress.find({
      discordId,
      periodKey: { $in: [daily, weekly] },
    });

    const progressMap = {};
    for (const p of progresses) progressMap[`${p.missionKey}|${p.periodKey}`] = p;

    return Object.values(MISSIONS).map(m => {
      const pKey = periodKey(m.type);
      const p    = progressMap[`${m.key}|${pKey}`];
      return {
        ...m,
        progress:  p?.progress  ?? 0,
        completed: p?.completed ?? false,
      };
    });
  }

  /** Nettoie les progressions plus vieilles que 14 jours (à appeler depuis CronService). */
  async cleanup() {
    const cutoff = new Date(Date.now() - 14 * 24 * 3600_000).toISOString().slice(0, 10);
    await MissionProgress.deleteMany({ periodKey: { $lt: cutoff } });
  }
}

module.exports = new MissionRepository();
