<div align="center">

# ⚡ Nexus Bot

**Le bot Discord gaming communautaire tout-en-un.**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Gemini AI](https://img.shields.io/badge/gemini-2.5--flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Version](https://img.shields.io/badge/version-2.2.0-brightgreen?style=flat-square)]()
[![Commandes](https://img.shields.io/badge/commandes-31-blue?style=flat-square)]()

[**Démo**](#) · [**Documentation**](./COMMANDES.md) · [**Installation**](#installation)

</div>

---

## 🎯 Qu'est-ce que Nexus ?

Nexus est un bot Discord **clé en main** conçu pour les serveurs gaming. Il transforme une communauté passive en un écosystème vivant : chaque message, chaque partie, chaque interaction crée de la valeur pour les membres.

**31 commandes slash. 17 modèles de données. Une IA intégrée. Zéro configuration complexe.**

---

## ✨ Fonctionnalités

### 🏆 Progression & Gamification
Système XP complet avec niveaux, rôles automatiques et badges collectionnables.

| Commande | Description |
|---|---|
| `/profil [@membre]` | Profil enrichi : XP, niveau (barre visuelle), coins, réputation, rang de saison, clan, AniList, badges, top 3 jeux |
| `/top [limite]` | Classement XP du serveur |
| `/niveau` | Roadmap des prochains niveaux avec XP requis et milestones |
| `/daily` | Bonus quotidien XP + coins avec streak cumulatif (récompense doublée après 7 jours) |
| `/missions` | 4 missions quotidiennes + 4 hebdomadaires avec barres de progression |
| `/badges [@membre]` | Catalogue des badges + badges secrets (shadow) |
| `/saison info/top/historique/terminer` | Classement saisonnier — reset XP, podium archivé |

> **Milestones automatiques** : niveau 5 → Rookie, niveau 15 → Vétéran, niveau 30 → Légende

---

### 🪙 Économie virtuelle
Système de coins cohérent : chaque action en rapporte, chaque article a un impact réel.

| Commande | Description |
|---|---|
| `/boutique voir/acheter` | Boost XP ×2/×3, rôle VIP, +réputation, reset daily |
| `/inventaire` | Achats passés + boost XP actif avec temps restant |
| `/bourse marche/acheter/vendre/cours/portefeuille` | **Bourse spéculative** sur les emojis du serveur — prix fluctuant selon l'utilisation |
| `/rep @membre` | +1 réputation communautaire (1 fois / 24h par cible) |
| `/coinflip [mise]` | Pile ou face avec pari optionnel en coins |

---

### 🎮 Mini-jeux & Social
| Commande | Description |
|---|---|
| `/duel @adversaire` | Pierre-feuille-ciseaux — XP au gagnant, win streak (5 victoires = badge 🔥) |
| `/quiz` | Question gaming aléatoire (30s) |
| `/coinflip [mise]` | Pile ou face avec animation et pari |
| `/sond <question> <options>` | Sondage jusqu'à 8 options, clôture automatique |
| `/tribunal @adversaire` | L'IA tranche un désaccord — verdict + transfert 50 coins |
| `/suggestion ajouter/liste/traiter` | Boîte à idées communautaire avec votes 👍👎 |

---

### 🏴 Clans & Mercenariat
| Commande | Description |
|---|---|
| `/clan creer/rejoindre/quitter/info/top/dissoudre` | Équipes permanentes — XP contribue au total clan |
| `/mercenaire contrats/rejoindre/poster/mes_contrats` | Contrats payants entre clans — XP contre coins |

---

### 🔍 LFG — Looking For Group
| Commande | Description |
|---|---|
| `/lfg creer/liste` | Annonces avec bouton Rejoindre, expiration automatique |

---

### 🤖 IA (Gemini 2.5 Flash)
Personnalité de rival gaming — sarcastique, compétitif, toujours en personnage.

- **Mention** `@Nexus` n'importe où — répond en moins de 15s
- **Répondre à un de ses messages** — continue la conversation (mémoire 2h)
- **Salon IA dédié** — répond à tous les messages (configurable via `/ai salon`)
- **Recherche web** — cherche des infos récentes si nécessaire
- **Accès à la DB** — peut afficher ton profil, ton classement, tes missions en direct
- `/recherche <requête>` — recherche web + résumé sourcé

---

### 🎌 AniList
| Commande | Description |
|---|---|
| `/register <pseudo>` | Lier son compte AniList à Discord |
| `/aniboard` | Classement anime du serveur par temps de visionnage |

---

### 🛡️ Modération progressive
| Commande | Description |
|---|---|
| `/warn add/list/clear` | Avertissements — mute auto 1h (3 warns) et 24h (5 warns) |

---

### ⚙️ Administration
| Commande | Description |
|---|---|
| `/autopost status/recap/rss/notif/rappel` | Activer/désactiver les messages automatiques |
| `/ai salon/reset/statut` | Configurer l'IA |
| `/event start/stop` | Événement XP ×2 |
| `/rappel on/off/set` | Rappels planifiés |

---

### 🔊 Vocal (automatique)
- **Salons temporaires** : rejoindre le salon Hub crée un salon privé, supprimé quand vide
- **Capture de territoire** : le clan majoritaire contrôle le salon (+2 XP/min), renommage automatique

---

### 📬 Messages automatiques
| Déclencheur | Contenu |
|---|---|
| Toutes les 6h | Récap XP + classement |
| Toutes les heures | Mises à jour patch notes (Warframe, Genshin, Wuthering Waves) |
| Toutes les 10min | Fermeture des LFG expirés |
| Chaque lundi 3h30 | Nettoyage DB missions |
| Minuit | Reset bourse aux emojis |
| En direct | Notifications gaming, level-up, badges |

---

## 🎭 Badges (13 visibles + 5 secrets)

| Badge | Condition |
|---|---|
| 🥉 Débutant | Niveau 5 |
| 🥈 Confirmé | Niveau 15 |
| 🥇 Expert | Niveau 30 |
| ⚔️ Combattant | Premier duel gagné |
| 🔥 Imbattable | 5 victoires consécutives en duel |
| 🎓 Érudit | Quiz complété |
| 🗳️ Votant | Participer à un sondage |
| 🎮 Gamer | Première session de jeu |
| + 5 badges secrets | Conditions cachées à découvrir |

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- MongoDB Atlas (gratuit)
- Bot Discord — intents requis : `Guilds`, `GuildPresences`, `GuildMembers`, `GuildMessages`, `MessageContent`, `GuildMessageReactions`
- Clé [Google AI Studio](https://aistudio.google.com) (gratuit)

### 1. Cloner & installer
```bash
git clone https://github.com/bof-e/nexus-bot.git
cd nexus-bot
npm install
```

### 2. Configurer
```bash
cp .env.example .env
# Remplir les variables obligatoires
```

```env
TOKEN=              # Token bot Discord
CLIENT_ID=          # ID application Discord
MONGODB_URI=        # URI MongoDB Atlas
GEMINI_API_KEY=     # Clé Google AI Studio (gratuit sur aistudio.google.com)

# Optionnel
GOOGLE_CSE_KEY=     # Meilleure recherche web
SERP_API_KEY=       # Alternative recherche
AI_CHANNEL_ID=      # Salon IA dédié
VOICE_HUB_CHANNEL_ID= # Salon vocal Hub
```

### 3. Déployer et lancer
```bash
npm run deploy   # Enregistre les commandes slash
npm start        # Lancer le bot
```

### Déploiement sur Render
1. Connecter le repo GitHub
2. **Build** : `npm install && npm run deploy`
3. **Start** : `node src/index.js`
4. Ajouter les variables d'env dans le dashboard

---

## 📁 Architecture

```
nexus-bot/
├── src/
│   ├── commands/
│   │   ├── admin/        (ai, autopost, event, notif, rappel, warn)
│   │   ├── anime/        (aniboard, register)
│   │   ├── economy/      (bourse)
│   │   ├── gamification/ (badges, boutique, daily, inventaire, missions, niveau, profil, saison, top)
│   │   ├── misc/         (aide, recherche, stats)
│   │   ├── polls/        (sond)
│   │   └── social/       (clan, coinflip, duel, lfg, mercenaire, quiz, rep, suggestion, tribunal)
│   ├── database/
│   │   ├── models/       (17 modèles Mongoose)
│   │   └── *Repository   (14 repositories)
│   ├── events/           (clientReady, guildMemberAdd, interactionCreate, messageCreate, presenceUpdate, voiceStateUpdate)
│   ├── services/         (AIService, CooldownManager, CronService, NexusContextService, RSSService, ShadowBadgeService, WebSearchService, XPService)
│   └── utils/            (embedBuilder, levelCalc, logger, randomResponses)
├── config/index.js
├── .env.example
└── package.json
```

---

## 🛒 Licence & Usage Commercial

Ce bot est un projet **privé**. Pour toute demande d'installation sur un serveur tiers, de licence ou de revente, contacte le développeur directement.

---

*Nexus v2.2.0 — Discord.js v14 · MongoDB Atlas · Gemini 2.5 Flash · Node.js 18+*
