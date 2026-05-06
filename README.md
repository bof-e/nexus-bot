<div align="center">

# ⚡ Nexus

**Le bot Discord qui transforme ton serveur gaming en véritable communauté.**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Gemini](https://img.shields.io/badge/gemini-2.5--flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)

</div>

---

## 🎯 C'est quoi Nexus ?

Nexus est un bot Discord complet pensé pour les serveurs gaming. Il récompense l'activité, crée de la compétition saine, anime les conversations et s'occupe de l'organisation à ta place — le tout sans configuration complexe.

Tu joues ? Il le sait. Tu montes de niveau ? Tout le monde le voit. Tu cherches des coéquipiers ? Une commande suffit. Et si tu veux juste parler — il répond, avec du caractère.

---

## 🧩 Ce que tu peux faire avec Nexus

### 🏆 Progression & Gamification
Chaque action sur le serveur rapporte de l'XP et des 🪙 coins. Les membres montent en niveau, débloquent des rôles automatiquement et accumulent des badges au fil du temps.

| Commande | Ce que ça fait |
|---|---|
| `/profil [@membre]` | Profil complet : XP, niveau, coins, réputation, badges, jeux |
| `/top` | Classement XP du serveur |
| `/daily` | Bonus quotidien avec streak cumulatif (+XP et coins) |
| `/badges` | Catalogue des 12 badges disponibles |
| `/missions` | Missions du jour et de la semaine avec récompenses |
| `/saison info / top / historique` | Classement saisonnier — chaque saison repart de zéro |

> Les niveaux 5, 15 et 30 attribuent automatiquement des rôles configurables.

---

### 🪙 Économie & Boutique
Les coins s'accumulent en jouant, en chattant, en complétant des missions. Ils se dépensent dans la boutique.

| Commande | Ce que ça fait |
|---|---|
| `/boutique voir` | Voir les articles et ton solde |
| `/boutique acheter` | Boost XP ×2 ou ×3, rôle VIP, reset daily, +réputation |
| `/rep @membre` | Donner un point de réputation (1 fois / 24h par cible) |

---

### 🎮 Mini-jeux & Social
| Commande | Ce que ça fait |
|---|---|
| `/duel @membre` | Pierre-feuille-ciseaux — le vainqueur gagne de l'XP |
| `/quiz` | Question gaming aléatoire, 30 secondes pour répondre |
| `/sond <question>` | Sondage jusqu'à 8 options, les votants gagnent de l'XP |
| `/lfg creer / liste` | Annonce Looking For Group avec bouton Rejoindre |
| `/suggestion ajouter / liste` | Soumettre une idée — la communauté vote 👍👎 |

---

### 🏴 Clans
Forme des équipes, accumule de l'XP collectif et grimpe dans le classement des clans.

| Commande | Ce que ça fait |
|---|---|
| `/clan creer` | Créer un clan avec nom + tag |
| `/clan rejoindre [tag]` | Rejoindre un clan existant |
| `/clan info / top` | Infos d'un clan ou classement général |
| `/clan quitter / dissoudre` | Quitter ou fermer son clan |

> Chaque XP gagné par un membre contribue au total XP de son clan.

---

### 🤖 Intelligence Artificielle
Nexus utilise Gemini pour répondre intelligemment quand on lui parle.

- **Mentionne-le** n'importe où : `@Nexus c'est quoi le meilleur build Warframe ?`
- **Réponds à un de ses messages** pour continuer la conversation
- **Configure un salon dédié** où il répond à tous les messages automatiquement
- Il peut **chercher sur le web** pour des infos récentes (prix, sorties, patch notes…)
- Il garde le **contexte de la conversation** en mémoire pendant 2h

La commande `/recherche <requête>` donne un résumé sourcé directement dans un embed.

---

### 📬 Automatique — sans rien faire
Nexus tourne en arrière-plan et gère tout seul :

| Ce qui se passe | Quand |
|---|---|
| 📊 Récap XP du serveur | Toutes les 6h |
| 🎮 Notification quand quelqu'un joue | En temps réel |
| 📰 Mises à jour Warframe / Genshin / Wuthering Waves | Dès qu'un patch sort |
| ⏰ Rappels programmés | Selon ta configuration |
| 🗳️ Clôture automatique des sondages | À l'expiration |
| 🔴 Fermeture des LFG expirés | Toutes les 10 minutes |
| 🎤 Création de salons vocaux temporaires | Quand quelqu'un rejoint le salon Hub |
| 👋 Accueil des nouveaux membres | Message serveur + DM |

Tout peut être activé / désactivé à la volée avec `/autopost`.

---

### 🛡️ Modération progressive
| Commande | Ce que ça fait |
|---|---|
| `/warn add @membre [raison]` | Avertissement — mute auto à 3 puis 5 warns |
| `/warn list @membre` | Historique des avertissements |
| `/warn clear @membre` | Effacer les warns d'un membre |

---

### 🎌 AniList
| Commande | Ce que ça fait |
|---|---|
| `/register <pseudo_anilist>` | Lier son compte AniList à Discord |
| `/aniboard` | Classement anime du serveur (temps de visionnage) |

---

## ⚙️ Installation

### Prérequis
- Node.js 18+
- Un compte [MongoDB Atlas](https://mongodb.com) (gratuit)
- Un bot Discord avec les intents : `Guilds`, `GuildPresences`, `GuildMembers`, `GuildMessages`, `MessageContent`, `GuildMessageReactions`
- Une clé [Google AI Studio](https://aistudio.google.com) (gratuit) pour l'IA

### 1. Cloner & installer
```bash
git clone https://github.com/ton-repo/nexus-bot.git
cd nexus-bot
npm install
```

### 2. Configurer l'environnement
```bash
cp .env.example .env
```

Remplis au minimum :
```env
TOKEN=           # Token du bot Discord
CLIENT_ID=       # ID de l'application Discord
MONGODB_URI=     # URI MongoDB Atlas
GEMINI_API_KEY=  # Clé Google AI Studio
```

### 3. Déployer les commandes slash
```bash
npm run deploy
```

### 4. Lancer
```bash
npm start          # Production
npm run dev        # Développement (hot-reload)
```

---

## 🔧 Déploiement sur Render

1. Connecte ton repo GitHub
2. **Build command** : `npm install && npm run deploy`
3. **Start command** : `node src/index.js`
4. Ajoute les variables d'environnement dans le dashboard Render
5. C'est tout — Nexus tourne 24h/24

---

## 📁 Structure du projet

```
nexus-bot/
├── src/
│   ├── commands/
│   │   ├── admin/        (ai, autopost, event, notif, rappel, warn)
│   │   ├── anime/        (aniboard, register)
│   │   ├── gamification/ (badges, boutique, daily, missions, profil, saison, top)
│   │   ├── misc/         (aide, recherche, stats)
│   │   ├── polls/        (sond)
│   │   └── social/       (clan, duel, lfg, quiz, rep, suggestion)
│   ├── database/
│   │   ├── models/       (17 modèles Mongoose)
│   │   └── *Repository   (14 repositories)
│   ├── events/           (6 events Discord)
│   ├── services/         (AI, Cron, RSS, WebSearch, XP, Cooldown)
│   └── utils/            (embedBuilder, levelCalc, logger, randomResponses)
├── config/index.js
├── .env.example
└── package.json
```

---

<div align="center">

*Nexus — Discord.js v14 · MongoDB · Gemini AI · Node.js 18+*

</div>
