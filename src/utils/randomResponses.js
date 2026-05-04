const responses = {
  startPlaying: {
    default: [
      '🎮 **{user}** a lancé **{game}**. La session commence, l\'excuse "juste une partie" aussi.',
      '🕹️ **{user}** est sur **{game}**. On prend les paris sur la durée ?',
      '▶️ **{user}** démarre **{game}**. Le canapé ne verra pas ce membre de sitôt.',
      '🎯 **{user}** rejoint **{game}**. Concentration maximale. Ou pas.',
    ],
    'Warframe': [
      '🚀 **{user}** a rejoint l\'Orbiter. MR check avant de sortir, on a dit.',
      '⚙️ **{user}** forge dans les abîmes de **Warframe**. On espère que Potato Prime est prêt.',
      '🛸 **{user}** part en mission sur **Warframe**. Le Lotus observe. Nous aussi.',
    ],
    'Genshin Impact': [
      '🌸 **{user}** est retourné à Teyvat. La résine ne va pas se regénérer toute seule.',
      '⚡ **{user}** pull sur **Genshin Impact**. On souhaite bonne chance pour les 50/50.',
      '🗺️ **{user}** explore **Genshin Impact**. Encore un monde entier à parcourir.',
    ],
    'Wuthering Waves': [
      '🌊 **{user}** plonge dans **Wuthering Waves**. Bon écho à toi.',
      '⚡ **{user}** tune dans **Wuthering Waves**. La fréquence est bonne.',
    ],
  },

  stopPlaying: [
    '🛑 **{user}** a quitté **{game}** après **{duration}**.',
    '⏹️ **{user}** raccroche sur **{game}** — **{duration}** de session.',
    '💤 **{user}** a éteint **{game}** (**{duration}**). Le repos des warriors.',
  ],

  switchGame: [
    '🔁 **{user}** quitte **{old}** pour **{new}**. L\'herbe est toujours plus verte.',
    '↩️ **{user}** abandonne **{old}** pour **{new}**. Déserteur.',
    '🎲 **{user}** passe de **{old}** à **{new}**. Décision audacieuse.',
  ],

  levelUp: [
    '🎉 **{user}** passe au **niveau {level}** ! Rang : **{rank}**.',
    '⬆️ Niveau {level} atteint par **{user}** ! Le serveur tremble.',
    '🌟 **{user}** monte en puissance — **Niveau {level}** ! **{rank}**.',
  ],

  dailyClaimed: [
    '✅ Bonus quotidien réclamé, **{user}** ! **+{xp} XP** — streak de **{streak} jour(s)**.',
    '🌅 Une nouvelle journée, une nouvelle récompense. **+{xp} XP** pour **{user}**.',
    '🎁 Bonus du jour encaissé par **{user}** — **+{xp} XP**. Revenez demain !',
  ],

  welcome: [
    '👋 Bienvenue sur le serveur, **{user}** ! Tape `/aide` pour découvrir toutes les commandes.',
    '🎮 **{user}** débarque ! Lance `/profil` pour voir où tu en es.',
    '🚀 **{user}** a atterri sur le serveur ! On espère que tu joues à de bons jeux.',
  ],

  duelWin: [
    '⚔️ **{winner}** écrase **{loser}** en duel ! **+{xp} XP** pour le vainqueur.',
    '🏆 **{winner}** l\'emporte contre **{loser}** ! Gloire et **+{xp} XP**.',
    '💥 **{winner}** atomise **{loser}** ! **+{xp} XP** mérités.',
  ],
};

function get(category, subKey = null, vars = {}) {
  let pool;
  if (subKey && responses[category]?.[subKey]) {
    pool = responses[category][subKey];
  } else if (responses[category]?.default) {
    pool = responses[category].default;
  } else if (Array.isArray(responses[category])) {
    pool = responses[category];
  } else {
    return '...';
  }

  let text = pool[Math.floor(Math.random() * pool.length)];
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, v);
  }
  return text;
}

module.exports = { get };
