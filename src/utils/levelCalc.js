const config = require('../../config');

/**
 * Retourne le XP total requis pour atteindre un niveau donné.
 */
function xpForLevel(level) {
  return config.levels.formula(level);
}

/**
 * Calcule le niveau actuel à partir du XP total.
 */
function levelFromXP(totalXP) {
  let level = 0;
  while (xpForLevel(level + 1) <= totalXP) level++;
  return level;
}

/**
 * Retourne le XP total requis pour le prochain niveau.
 */
function xpForNextLevel(currentLevel) {
  return xpForLevel(currentLevel + 1);
}

/**
 * Retourne le % de progression vers le prochain niveau (0–100).
 */
function progressPercent(totalXP) {
  const currentLevel = levelFromXP(totalXP);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const progress = totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return Math.min(100, Math.floor((progress / needed) * 100));
}

/**
 * Génère une barre de progression ASCII (longueur = 12).
 */
function progressBar(percent, length = 12) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Nom de rang selon le niveau.
 */
function rankName(level) {
  if (level >= 30) return 'Légende ✨';
  if (level >= 15) return 'Vétéran ⚔️';
  if (level >= 5)  return 'Rookie 🎮';
  return 'Recrue 🌱';
}

module.exports = { xpForLevel, levelFromXP, xpForNextLevel, progressPercent, progressBar, rankName };
