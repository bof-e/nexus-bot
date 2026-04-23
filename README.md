# 🤖 Nexus Bot v2

Bot Discord gaming communautaire — refonte complète avec gamification, XP, badges et mini-jeux.

## ✨ Fonctionnalités

### Gamification
- **Système XP multi-sources** : jeu, votes, messages, daily, duels
- **Niveaux** avec formule progressive (lvl² × 100 XP)
- **Attribut rôles automatiquement** aux niveaux 5, 15 et 30
- **12 badges** répartis en 5 catégories
- **Streaks quotidiens** avec bonus cumulatif

### Commandes slash
| Commande | Description |
|---|---|
| `/profil [@user]` | Profil complet : XP, niveau, top jeux, badges |
| `/top [limite]` | Classement XP du serveur |
| `/daily` | Bonus XP quotidien + gestion streak |
| `/badges [@user]` | Catalogue des badges disponibles |
| `/stats [@user]` | Temps de jeu détaillé par jeu |
| `/sond <question> <opts...>` | Sondage avec XP pour les votants |
| `/duel @user` | Pierre-feuille-ciseaux pour XP |
| `/quiz` | Question gaming, 30s pour répondre |
| `/aide` | Liste de toutes les commandes |
| `/rappel on/off/set/status` | Rappels automatiques (admin) |
| `/notif on/off/status` | Notifications de présence (admin) |
| `/event start/stop` | Événement XP x2 temporaire (admin) |

### Automatique (sans commande)
- Messages dans le salon gaming quand quelqu'un joue
- Tracking du temps de jeu par session
- Récap toutes les 6h
- Veille RSS (Warframe, Genshin, Wuthering Waves)
- Clôture automatique des sondages
- Accueil des nouveaux membres (message + DM)

## 🚀 Installation

### 1. Prérequis
- Node.js 20+
- Un bot Discord avec les intents : Guilds, GuildPresences, GuildMembers, GuildMessages, MessageContent, GuildMessageReactions

### 2. Installation des dépendances
```bash
npm install
```

### 3. Configuration
```bash
cp .env.example .env
# Remplir les variables dans .env
```

Variables obligatoires :
- `TOKEN` — Token du bot Discord
- `CLIENT_ID` — ID de l'application Discord

Variables recommandées :
- `GCHANNEL_ID` — Salon où poster les messages de présence gaming
- `RECAP_CHANNEL_ID` — Salon pour les récaps automatiques
- `STATS_CHANNEL_ID` — Salon pour les stats quotidiennes
- `UPDATE_CHANNEL_ID` — Salon pour les mises à jour des jeux
- `REMINDER_CHANNEL_ID` — Salon pour les rappels

### 4. Déployer les slash commands
```bash
# En développement (instantané sur votre serveur) :
GUILD_ID=votre_guild_id npm run deploy

# En production (global, propagation ~1h) :
npm run deploy
```

### 5. Lancer le bot
```bash
npm start
# ou en développement avec hot-reload :
npm run dev
```

## 📁 Structure
```
nexus-bot/
├── src/
│   ├── commands/
│   │   ├── gamification/   (profil, top, daily, badges)
│   │   ├── social/         (duel, quiz)
│   │   ├── polls/          (sond)
│   │   ├── misc/           (stats, aide)
│   │   └── admin/          (rappel, notif, event)
│   ├── events/             (ready, presenceUpdate, interactionCreate, guildMemberAdd, messageCreate)
│   ├── services/           (XPService, RSSService, CronService, CooldownManager)
│   ├── database/           (db, migrations, UserRepository, GameRepository, PollRepository, BadgeRepository)
│   ├── loaders/            (CommandLoader, EventLoader)
│   ├── utils/              (logger, embedBuilder, levelCalc, randomResponses)
│   ├── server.js
│   └── index.js
├── config/index.js
├── data/nexus.db           (créé automatiquement)
├── logs/                   (créé automatiquement)
├── deploy-commands.js
└── package.json
```

## ⚙️ Configuration avancée (config/index.js)

Tous les paramètres sont centralisés dans `config/index.js` :
- Gains d'XP par action
- Cooldowns des commandes
- Feeds RSS
- Niveaux pour les rôles

## 🔧 Déploiement sur Render

1. Connecter le repo
2. Build command : `npm install`
3. Start command : `npm start`
4. Ajouter un **Persistent Disk** monté sur `/app/data` pour ne pas perdre la base SQLite
5. Remplir les variables d'environnement dans le dashboard Render

## 📊 Dashboard web

Accessible à `https://votre-url.render.com/leaderboard` — leaderboard public en lecture seule.

---

*Nexus Bot v2 — Architecture modulaire · SQLite · Slash Commands · Gamification complète*
