/**
 * NexusContextService
 * Fournit à l'IA un accès à ses propres commandes et aux données live de la DB.
 * Utilisé comme outil de function calling dans AIService.
 */

const UserRepository   = require('../database/UserRepository');
const ClanRepository   = require('../database/ClanRepository');
const BadgeRepository  = require('../database/BadgeRepository');
const MissionRepository = require('../database/MissionRepository');
const AniListRepository = require('../database/AniListRepository');
const SeasonRepository = require('../database/SeasonRepository');
const { levelFromXP }  = require('../utils/levelCalc');
const logger           = require('../utils/logger');

// ─── Catalogue des commandes (résumé compact pour le contexte IA) ────────────
const COMMAND_CATALOG = {
  progression: {
    label: 'Progression & Profil',
    commands: [
      { name: '/profil [@membre]',       desc: 'Fiche complète : niveau, XP, coins, réputation, badges, jeux joués' },
      { name: '/top [limite]',           desc: 'Classement XP du serveur' },
      { name: '/daily',                  desc: 'Bonus quotidien XP + coins (toutes les 22h, streak cumulatif)' },
      { name: '/missions',               desc: '4 missions quotidiennes + 4 hebdomadaires avec récompenses automatiques' },
      { name: '/badges [@membre]',       desc: 'Catalogue des badges. Les badges shadow sont cachés jusqu\'à leur déblocage' },
      { name: '/saison info/top/historique/terminer', desc: 'Classement saisonnier — reset XP en fin de saison, archives consultables' },
    ],
  },
  economie: {
    label: 'Économie',
    commands: [
      { name: '/boutique voir/acheter',  desc: 'Boutique : boost XP ×2/×3, rôle VIP, +réputation, reset daily. Gains : 1 coin par 5 XP' },
      { name: '/bourse marche/acheter/vendre/cours/portefeuille', desc: 'Bourse spéculative : les emojis custom ont un prix qui fluctue selon leur utilisation dans le chat' },
      { name: '/rep @membre',            desc: 'Donne +1 réputation (1 fois par cible par 24h)' },
    ],
  },
  social: {
    label: 'Mini-jeux & Social',
    commands: [
      { name: '/duel @adversaire',       desc: 'Pierre-feuille-ciseaux, le gagnant gagne XP + coins' },
      { name: '/quiz',                   desc: 'Question gaming aléatoire, 30s pour répondre' },
      { name: '/sond <question> <options>', desc: 'Sondage jusqu\'à 8 options, clôture automatique' },
      { name: '/tribunal @adversaire',   desc: 'L\'IA tranche un désaccord. Le perdant peut se voir débiter 50 coins' },
      { name: '/suggestion ajouter/liste/traiter', desc: 'Boîte à idées communautaire avec votes 👍👎' },
    ],
  },
  clans: {
    label: 'Clans & Mercenariat',
    commands: [
      { name: '/clan creer/rejoindre/quitter/info/top/dissoudre', desc: 'Équipes permanentes — chaque XP contribue au total XP du clan' },
      { name: '/mercenaire contrats/rejoindre/poster/mes_contrats', desc: 'Les clans paient des joueurs solo pour générer de l\'XP à leur place' },
    ],
  },
  lfg: {
    label: 'LFG (Looking For Group)',
    commands: [
      { name: '/lfg creer/liste',        desc: 'Annonces pour trouver des coéquipiers, avec bouton Rejoindre' },
    ],
  },
  ia: {
    label: 'IA & Recherche',
    commands: [
      { name: '@Nexus <message>',        desc: 'Parle directement à Nexus (mention, réponse directe, ou salon dédié)' },
      { name: '/recherche <requête>',    desc: 'Recherche web + résumé IA avec sources' },
    ],
  },
  anilist: {
    label: 'AniList',
    commands: [
      { name: '/register <pseudo>',      desc: 'Lie ton compte AniList à Discord' },
      { name: '/aniboard',               desc: 'Classement anime du serveur par temps de visionnage' },
    ],
  },
  moderation: {
    label: 'Modération (perm: Modérer)',
    commands: [
      { name: '/warn add/list/clear',    desc: 'Avertissements progressifs — mute auto à 3 warns (1h) et 5 warns (24h)' },
    ],
  },
  admin: {
    label: 'Administration (perm: Gérer le serveur)',
    commands: [
      { name: '/autopost status/recap/rss/notif/rappel', desc: 'Activer/désactiver les messages automatiques' },
      { name: '/ai salon/reset/statut',  desc: 'Configurer le salon IA, effacer l\'historique' },
      { name: '/event start/stop',       desc: 'Lancer un événement XP ×2' },
    ],
  },
  vocal: {
    label: 'Vocal (automatique)',
    commands: [
      { name: 'Salons temporaires',      desc: 'Rejoindre le salon Hub crée un salon privé à ton nom, supprimé quand vide' },
      { name: 'Capture de territoire',   desc: 'Le clan majoritaire dans un salon gagne 2 XP/min. Il est renommé à leurs couleurs si capturé' },
    ],
  },
  shadow: {
    label: 'Badges secrets',
    commands: [
      { name: '👻 Le Fantôme',           desc: 'Condition secrète liée à l\'absence' },
      { name: '💀 Skill Issue Certifié', desc: 'Condition secrète liée aux duels' },
      { name: '🌙 Insomniaque',          desc: 'Condition secrète liée aux horaires' },
      { name: '🐋 Baleine',              desc: 'Condition secrète liée aux achats' },
      { name: '🗿 Le Contre',            desc: 'Condition secrète liée aux votes' },
    ],
  },
};

class NexusContextService {

  /**
   * Retourne les infos sur les commandes selon une recherche.
   * query = 'all' → tout le catalogue
   * query = 'clan' → commandes de la catégorie clans
   * query = '/bourse' → description précise de la commande bourse
   */
  getCommands(query = 'all') {
    const q = query.toLowerCase().trim();

    if (q === 'all' || q === '') {
      return Object.values(COMMAND_CATALOG).map(cat =>
        `**${cat.label}** :\n` +
        cat.commands.map(c => `• \`${c.name}\` — ${c.desc}`).join('\n')
      ).join('\n\n');
    }

    // Chercher dans les catégories
    for (const [key, cat] of Object.entries(COMMAND_CATALOG)) {
      if (key.includes(q) || cat.label.toLowerCase().includes(q)) {
        return `**${cat.label}** :\n` +
          cat.commands.map(c => `• \`${c.name}\` — ${c.desc}`).join('\n');
      }
    }

    // Chercher dans les commandes individuelles
    const matches = [];
    for (const cat of Object.values(COMMAND_CATALOG)) {
      for (const cmd of cat.commands) {
        if (cmd.name.toLowerCase().includes(q) || cmd.desc.toLowerCase().includes(q)) {
          matches.push(`• \`${cmd.name}\` — ${cmd.desc}`);
        }
      }
    }
    return matches.length ? matches.join('\n') : 'Aucune commande trouvée pour cette recherche.';
  }

  /**
   * Retourne des stats live depuis la DB.
   * type = 'top' | 'server' | 'season' | 'clans' | 'missions'
   */
  async getLiveStats(type, discordId = null) {
    try {
      switch (type) {
        case 'top': {
          const top = await UserRepository.topByXP(5);
          return top.map((u, i) =>
            `${i + 1}. **${u.username}** — ${u.xp.toLocaleString()} XP (niveau ${levelFromXP(u.xp)})`
          ).join('\n') || 'Aucun membre classé.';
        }

        case 'server': {
          const users = await UserRepository.topByXP(500);
          const totalXP    = users.reduce((s, u) => s + u.xp, 0);
          const totalCoins = users.reduce((s, u) => s + (u.coins ?? 0), 0);
          return `**${users.length}** membres enregistrés · **${totalXP.toLocaleString()} XP** cumulés · **${totalCoins.toLocaleString()} 🪙** en circulation`;
        }

        case 'season': {
          const season = await SeasonRepository.getCurrentSeason();
          const start  = await SeasonRepository.getSeasonStart();
          await SeasonRepository.snapshot(season);
          const top3   = await SeasonRepository.getLeaderboard(season, 3);
          const podium = top3.map((e, i) => {
            const medals = ['🥇','🥈','🥉'];
            return `${medals[i]} **${e.username}** — ${e.xp.toLocaleString()} XP`;
          }).join('\n');
          const days = Math.floor((Date.now() - start) / 86400000);
          return `Saison **${season}** · Débutée il y a **${days} jours**\n\nPodium actuel :\n${podium}`;
        }

        case 'clans': {
          const clans = await ClanRepository.top(5);
          return clans.map((c, i) =>
            `${i + 1}. **[${c.tag}] ${c.name}** — ${c.xpTotal.toLocaleString()} XP · ${c.members.length} membres`
          ).join('\n') || 'Aucun clan créé.';
        }

        case 'profile': {
          if (!discordId) return 'ID Discord non disponible.';
          const user = await UserRepository.findOrCreate(discordId, 'Utilisateur');
          if (!user) return 'Profil introuvable.';

          const { levelFromXP, xpForNextLevel } = require('../utils/levelCalc');
          const level    = levelFromXP(user.xp || 0);
          const nextXP   = xpForNextLevel(level);
          const xp       = user.xp || 0;

          // Badges
          const Badge    = require('../database/models/Badge');
          const badgeDocs = await Badge.find({ discordId });
          const catalog  = BadgeRepository.getCatalogFull();
          const badgeList = badgeDocs.map(b => {
            const def = catalog[b.badgeKey];
            return def ? def.emoji + ' ' + def.name : b.badgeKey;
          });

          // AniList
          const aniEntry = await AniListRepository.findByDiscordId(discordId).catch(() => null);

          let result = `**Profil de <@${discordId}>**\n`;
          result += `🏅 Niveau **${level}** · ${xp.toLocaleString()} XP (${nextXP.toLocaleString()} pour le prochain)\n`;
          result += `🪙 **${(user.coins ?? 0).toLocaleString()} coins** · ⭐ **${user.reputation ?? 0} réputation**\n`;
          result += `🔥 Streak daily : **${user.dailyStreak ?? 0} jour${(user.dailyStreak ?? 0) > 1 ? 's' : ''}**\n`;
          if (badgeList.length) result += `🎖 Badges : ${badgeList.join(', ')}\n`;
          if (aniEntry) result += `🎌 AniList : **${aniEntry.anilistUsername}**\n`;
          return result.trim();
        }

        case 'missions': {
          if (!discordId) return 'ID utilisateur requis pour les missions.';
          const missions = await MissionRepository.getUserMissions(discordId);
          const daily    = missions.filter(m => m.type === 'daily');
          const weekly   = missions.filter(m => m.type === 'weekly');
          const fmtMission = m =>
            `• **${m.name}** — ${m.progress}/${m.goal} ${m.completed ? '✅' : ''}`;
          return `**Quotidiennes :**\n${daily.map(fmtMission).join('\n')}\n\n**Hebdomadaires :**\n${weekly.map(fmtMission).join('\n')}`;
        }

        default:
          return 'Type de stat inconnu.';
      }
    } catch (e) {
      logger.warn('[NexusContext] Erreur stats : ' + e.message);
      return 'Données temporairement indisponibles.';
    }
  }
}

module.exports = new NexusContextService();
