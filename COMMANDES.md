# 📖 Documentation Complète des Commandes — Nexus

> **Comment lire ce guide**
> - `<paramètre>` → obligatoire
> - `[paramètre]` → optionnel
> - **XP** → points d'expérience qui font monter de niveau
> - **Coins 🪙** → monnaie virtuelle du serveur, à dépenser en boutique
> - **Streak** → série de jours consécutifs sans interruption
> - **Slash command** → commande Discord qui commence par `/`

---

## 🏆 CATÉGORIE : PROGRESSION & PROFIL

*Ces commandes tournent autour de ta progression personnelle sur le serveur. Plus tu es actif, plus tu montes en niveau.*

---

### `/profil [@membre]`

**Ce que ça fait** : Affiche la fiche complète d'un membre — son niveau, son XP, ses coins, sa réputation, ses badges obtenus et le temps passé sur chaque jeu.

**Paramètres** :
- `[@membre]` *(optionnel)* — Si tu ne mets rien, ça affiche **ton** profil. Si tu mentionnes quelqu'un, ça affiche **le sien**.

**Exemples** :
```
/profil                    → Voir mon propre profil
/profil @Kira              → Voir le profil de Kira
```

**Ce que tu y vois** :
- Niveau actuel et barre de progression vers le suivant
- XP total accumulé
- 🪙 Coins disponibles
- ⭐ Score de réputation (donné par les autres membres)
- Badges débloqués
- Top 3 des jeux les plus joués avec le temps de session

---

### `/top [limite]`

**Ce que ça fait** : Affiche le classement XP du serveur. Du membre le plus actif au moins actif, avec médailles pour le podium.

**Paramètres** :
- `[limite]` *(optionnel)* — Nombre de membres à afficher. Défaut : 10. Maximum : 15.

**Exemples** :
```
/top          → Classement des 10 premiers
/top 15       → Classement des 15 premiers
```

**Conseil** : Regarde ce classement régulièrement — les positions changent selon l'activité de la semaine.

---

### `/daily`

**Ce que ça fait** : Réclame ton bonus quotidien. Tu reçois de l'XP et des coins, et ton **streak** (série de jours consécutifs) augmente. Plus ton streak est long, plus la récompense est grande.

**Paramètres** : Aucun.

**Exemple** :
```
/daily
→ Tu reçois 50 XP + 25 🪙
→ Streak : 5 jours (+bonus)
```

**Règles importantes** :
- Utilisable **une seule fois toutes les 22h** (pas forcément à la même heure exacte chaque jour)
- Si tu rates un jour, ton streak repart à zéro
- Un streak de 7 jours débloque la mission hebdomadaire "Régularité"

---

### `/missions`

**Ce que ça fait** : Affiche toutes tes missions en cours avec leur état d'avancement. Les missions se renouvellent automatiquement — 4 missions quotidiennes et 4 hebdomadaires.

**Paramètres** : Aucun.

**Exemple** :
```
/missions
→ 📅 Quotidiennes (2/4 complétées)
   📝 Bavard du jour — Envoie 5 messages [████░░░░] 3/5 · +20XP +10🪙
   ⚔️ Duelliste — Participe à 1 duel [✅ Complété] · +25XP +20🪙
   ...
```

**Liste des missions** :

| Mission | Type | Objectif | Récompense |
|---|---|---|---|
| 📝 Bavard du jour | Quotidienne | 5 messages envoyés | +20 XP, +10 🪙 |
| 📅 Discipline | Quotidienne | Réclamer le /daily | +15 XP, +15 🪙 |
| ⚔️ Duelliste | Quotidienne | Participer à 1 duel | +25 XP, +20 🪙 |
| 🧠 Culture G | Quotidienne | Répondre à 1 quiz | +20 XP, +15 🪙 |
| 💬 Communautaire | Hebdomadaire | 50 messages dans la semaine | +100 XP, +75 🪙 |
| 🏆 Guerrier | Hebdomadaire | Gagner 3 duels | +150 XP, +100 🪙 |
| 🔥 Régularité | Hebdomadaire | Streak de 7 jours | +200 XP, +150 🪙 |
| 🎮 Gamer | Hebdomadaire | 2h de jeu total | +120 XP, +80 🪙 |

Les récompenses sont attribuées **automatiquement** à la complétion.

---

### `/badges [@membre]`

**Ce que ça fait** : Affiche le catalogue complet des badges disponibles et ceux qu'un membre a débloqués. Les **badges shadow** (secrets) n'apparaissent pas dans cette liste — il faut les découvrir soi-même.

**Paramètres** :
- `[@membre]` *(optionnel)* — Voir les badges d'un autre membre.

**Exemples** :
```
/badges               → Mes badges
/badges @Kira         → Les badges de Kira
```

**Comment débloquer des badges** : En jouant naturellement. Certains récompensent l'assiduité, d'autres les victoires en duel, la participation aux sondages, etc. Il existe aussi des **badges shadow** (🎭 Succès cachés) dont les conditions ne sont volontairement pas affichées.

---

### `/saison info`
### `/saison top`
### `/saison historique <numéro>`
### `/saison terminer` *(Admin)*

**Ce que c'est** : Le classement XP fonctionne en **saisons**. Chaque saison est une compétition temporaire — à la fin, le podium est archivé, les XP sont remis à zéro, et tout le monde repart de zéro pour la saison suivante. Ça donne une chance à tout le monde de compétir, même aux nouveaux arrivants.

**Sous-commandes** :

`/saison info` → Affiche la saison en cours, ta position dans le classement et le nombre de participants.
```
/saison info
→ 🏆 Saison 2 en cours (débutée le 01/05/2025)
   📊 Ton XP cette saison : 1 240
   🏅 Ton rang : #4
   👥 32 participants
```

`/saison top` → Classement en temps réel de la saison en cours (snapshot automatique).
```
/saison top
→ 🥇 @Kira — 3 450 XP
   🥈 @Mako — 2 910 XP
   ...
```

`/saison historique <numéro>` → Consulte les résultats archivés d'une saison passée.
```
/saison historique 1
→ 📜 Archives — Saison 1
   🥇 Kira — 8 200 XP (rank final #1)
   ...
```

`/saison terminer` *(Admin uniquement)* → Clôture la saison, archive les résultats, remet tous les XP à zéro, annonce le podium dans le canal recap, et démarre la saison suivante.

---

## 🪙 CATÉGORIE : ÉCONOMIE

*Les coins sont la monnaie du serveur. Tu en gagnes automatiquement en étant actif (1 coin par 5 XP gagné). Tu peux les dépenser en boutique, les investir en bourse, ou les perdre au tribunal.*

---

### `/boutique voir`
### `/boutique acheter <article>`

**Ce que ça fait** : Accède à la boutique du serveur pour dépenser tes 🪙 coins contre des avantages concrets.

**Articles disponibles** :

| Article | Prix | Effet |
|---|---|---|
| ⚡ Boost XP ×2 (1h) | 150 🪙 | Double tous tes gains XP pendant 1 heure |
| 🚀 Mega Boost XP ×3 (1h) | 350 🪙 | Triple tous tes gains XP pendant 1 heure |
| 👑 Rôle VIP | 500 🪙 | Obtiens le rôle VIP permanent (achat unique) |
| ⭐ +5 Réputation | 100 🪙 | Augmente ton score de réputation de 5 points |
| 🔄 Reset Daily | 200 🪙 | Remet ton cooldown /daily à zéro immédiatement |

**Exemples** :
```
/boutique voir
→ Affiche le catalogue avec ton solde actuel

/boutique acheter ⚡ Boost XP (×2 / 1h)
→ Débite 150 🪙, active le boost pendant 60 minutes
```

**Conseil** : Utilise un Boost XP juste avant une session de jeu ou quand tu prévois d'envoyer beaucoup de messages — tu maximises le retour sur investissement.

---

### `/bourse marche`
### `/bourse acheter <emoji> [parts]`
### `/bourse vendre <emoji> [parts]`
### `/bourse cours <emoji>`
### `/bourse portefeuille`

**Ce que c'est** : Un marché boursier virtuel basé sur les **emojis custom du serveur**. Chaque emoji a une valeur en coins qui fluctue selon son utilisation. Plus un emoji est utilisé, plus son prix baisse (inflation). Plus il est rare, plus sa valeur monte.

**Mécanisme de prix** :
- Chaque utilisation d'un emoji dans le chat baisse son prix de ~2%
- La nuit (reset à minuit), les prix remontent naturellement si l'emoji n'est pas utilisé
- Prix minimum : 10 🪙/part — Prix maximum : 10 000 🪙/part

**Sous-commandes** :

`/bourse marche` → Voir les 10 emojis les plus valorisés du moment avec leur tendance (📈 hausse, 📉 baisse).

`/bourse acheter <emoji> [parts]` → Acheter des parts d'un emoji au prix actuel.
```
/bourse acheter :pog: 10
→ Achat de 10 parts de :pog: à 85 🪙/part
→ Coût total : 850 🪙
```

`/bourse vendre <emoji> [parts]` → Revendre tes parts (laisse `[parts]` vide pour tout vendre).
```
/bourse vendre :pog:
→ Vente de 10 parts à 140 🪙/part
→ Gains : 1 400 🪙 · PnL : +550 🪙 ✅
```

`/bourse cours <emoji>` → Voir le cours détaillé d'un emoji avec une courbe sparkline des 12 derniers prix.

`/bourse portefeuille` → Voir toutes tes positions ouvertes, leur valeur actuelle et ton profit/perte total.

**Stratégies** :
- Acheter un emoji peu utilisé → le laisser monter → vendre
- Coordonner avec son clan pour boycotter l'emoji préféré d'un autre clan et faire chuter son cours
- Spammer un emoji pour faire baisser le cours des positions de tes ennemis

---

### `/rep @membre`

**Ce que ça fait** : Donne +1 point de réputation à un membre que tu apprécies ou qui t'a aidé. La réputation est visible sur le profil et est un indicateur de confiance communautaire.

**Règles** :
- 1 seul rep par cible par 24 heures
- Tu ne peux pas te rep toi-même
- Pas de limite sur le nombre de personnes différentes que tu peux rep par jour

**Exemple** :
```
/rep @Kira
→ +1 ⭐ de réputation donné à Kira
→ Kira est maintenant à 47 ⭐
```

---

## 🎮 CATÉGORIE : MINI-JEUX & SOCIAL

*Des interactions ludiques entre membres pour pimenter le serveur.*

---

### `/duel @adversaire`

**Ce que ça fait** : Lance un duel de **pierre-feuille-ciseaux** contre un autre membre. Le gagnant remporte de l'XP et des coins. Les deux joueurs progressent dans leurs missions.

**Paramètres** :
- `@adversaire` *(obligatoire)* — Le membre que tu veux défier.

**Exemple** :
```
/duel @Kira
→ Kira choisit ✊, toi tu choisis ✋
→ Tu gagnes ! +30 XP +15 🪙
→ Mission "Duelliste" complétée !
```

**Bonus** : Perdre 5 duels d'affilée en moins de 10 minutes débloque le badge shadow 💀 *Skill Issue Certifié*.

---

### `/quiz`

**Ce que ça fait** : Pose une question culture générale gaming. Tu as 30 secondes pour répondre. La bonne réponse rapporte de l'XP et progresse la mission "Culture G".

**Paramètres** : Aucun.

**Exemple** :
```
/quiz
→ "Dans quel jeu trouve-t-on le personnage Cloud Strife ?"
   A) Kingdom Hearts  B) Final Fantasy VII  C) Xenogears  D) Chrono Trigger
→ Tu réponds B → Bonne réponse ! +25 XP
```

---

### `/sond <question> <option1> <option2> [option3..8] [durée]`

**Ce que ça fait** : Crée un sondage interactif dans le canal. Les membres votent en cliquant sur les réactions. Le créateur et les votants gagnent de l'XP.

**Paramètres** :
- `<question>` *(obligatoire)* — La question posée.
- `<option1>` et `<option2>` *(obligatoires)* — Minimum 2 options.
- `[option3 à option8]` *(optionnels)* — Jusqu'à 8 options au total.
- `[durée]` *(optionnel)* — En heures. Défaut : 24h. Maximum : 168h (1 semaine).

**Exemple** :
```
/sond "Quel jeu ce soir ?" "Valorant" "League of Legends" "Minecraft" durée:6
→ Crée un sondage qui dure 6h avec 3 options
```

À la clôture, les résultats sont affichés automatiquement avec pourcentages et gagnant.

---

### `/tribunal @adversaire <litige> <ton_argument> <argument_adverse>`

**Ce que ça fait** : Tu as un désaccord avec quelqu'un ? L'IA joue le rôle d'un juge impartial (mais sarcastique) et rend un **verdict définitif**. Le perdant peut se voir infliger une amende symbolique de 50 coins, automatiquement transférés au gagnant.

**Paramètres** :
- `@adversaire` *(obligatoire)* — La personne avec qui tu es en désaccord.
- `<litige>` *(obligatoire)* — Le sujet du désaccord (max 200 caractères).
- `<ton_argument>` *(obligatoire)* — Ton point de vue (max 300 caractères).
- `<argument_adverse>` *(obligatoire)* — L'argument de l'autre (tel que tu le comprends).

**Exemple** :
```
/tribunal @Kira
  litige: "Qui est le meilleur support de League of Legends"
  ton_argument: "Thresh a le meilleur kit utilitaire du jeu"
  argument_adverse: "Lulu est plus polyvalente et son ult est game-changing"
→ L'IA analyse les deux arguments et tranche
→ Verdict : Lulu gagne. 50 🪙 transférés de ton compte vers Kira.
```

**Cooldown** : 5 minutes entre deux tribunaux dans le même canal.

---

### `/suggestion ajouter <idee>`
### `/suggestion liste`
### `/suggestion traiter <id> <décision> [note]` *(Admin)*

**Ce que ça fait** : Système de boîte à idées communautaire. Les membres soumettent des suggestions, la communauté vote, les admins traitent.

`/suggestion ajouter <idee>` → Soumettre une idée (max 500 caractères). Elle apparaît dans le canal de suggestions avec des boutons 👍 et 👎.
```
/suggestion ajouter Ajouter un système de tournois mensuel
→ Ta suggestion est postée dans #suggestions
→ Les membres peuvent voter avec 👍 / 👎
```

`/suggestion liste` → Voir les 8 dernières suggestions avec leur score et statut.

`/suggestion traiter` *(Admin)* → Approuver ou rejeter une suggestion avec une note explicative. Le message original se met à jour automatiquement.
```
/suggestion traiter id:64f3a... décision:approuvée note:"Prévu pour le mois prochain !"
```

---

## 🏴 CATÉGORIE : CLANS

*Un clan est une équipe permanente. Chaque XP gagné par un membre contribue au total XP de son clan. Les clans s'affrontent dans le classement.*

---

### `/clan creer <nom> <tag> [description]`

**Ce que ça fait** : Crée ton propre clan. Tu en deviens automatiquement le chef.

**Paramètres** :
- `<nom>` *(obligatoire)* — Nom du clan (max 30 caractères).
- `<tag>` *(obligatoire)* — Identifiant court de 2 à 5 lettres, en majuscules (ex: `APEX`, `GG`, `NEXUS`).
- `[description]` *(optionnel)* — Présentation du clan (max 150 caractères).

**Exemple** :
```
/clan creer nom:Les Intouchables tag:LI description:Top fraggeurs du serveur
```

**Important** : Tu ne peux appartenir qu'à **un seul clan** à la fois.

---

### `/clan rejoindre <tag>`

**Ce que ça fait** : Rejoindre un clan existant via son tag.

```
/clan rejoindre tag:LI
→ Bienvenue dans [LI] Les Intouchables ! 🎉
```

---

### `/clan info [tag]`

**Ce que ça fait** : Affiche les informations d'un clan — chef, membres, XP total, date de création.

```
/clan info              → Infos de TON clan
/clan info tag:APEX     → Infos du clan APEX
```

---

### `/clan top`

**Ce que ça fait** : Classement général des clans par XP cumulé (toute l'activité de tous les membres).

---

### `/clan quitter`

Quitter son clan. Impossible si tu en es le chef — utilise `/clan dissoudre` à la place.

---

### `/clan dissoudre`

*(Chef uniquement)* — Supprime définitivement le clan et libère tous ses membres.

---

## ⚔️ CATÉGORIE : MERCENARIAT

*Le mercenariat permet aux chefs de clan de poster des contrats rémunérés pour recruter des joueurs solo temporairement.*

---

### `/mercenaire contrats`

**Ce que ça fait** : Affiche tous les contrats ouverts actuellement — avec le clan qui offre, la récompense en coins, l'objectif XP à atteindre et le temps restant.

```
/mercenaire contrats
→ 📜 Contrat [LI] Les Intouchables
   💰 500 🪙 · 🎯 5 000 XP à générer · ⏱ Expire dans 12h
   [████░░░░░░] 42% · ⚔️ 3 mercenaires engagés
```

---

### `/mercenaire rejoindre <id>`

**Ce que ça fait** : S'enrôler dans un contrat. À partir de là, **tout XP que tu génères** sur le serveur (messages, jeux, duels…) est comptabilisé dans l'objectif du contrat.

```
/mercenaire rejoindre id:64f3a...
→ Tu es maintenant mercenaire pour [LI] Les Intouchables !
```

Quand l'objectif est atteint, la récompense est **divisée équitablement** entre tous les mercenaires.

---

### `/mercenaire poster <recompense> <xp_cible> <durée>` *(Chef de clan uniquement)*

**Ce que ça fait** : Publier un contrat. Les coins de la récompense sont **immédiatement débités** de ton compte et mis en escrow. Si le contrat expire sans être complété, tu es remboursé.

**Paramètres** :
- `<recompense>` — Coins offerts (50 à 50 000 🪙).
- `<xp_cible>` — XP total à générer par les mercenaires (500 à 100 000).
- `<durée>` — En heures (1 à 48h).

```
/mercenaire poster recompense:500 xp_cible:5000 duree:24
→ Contrat posté ! 500 🪙 mis en jeu.
→ Partage l'ID aux mercenaires potentiels.
```

---

### `/mercenaire mes_contrats`

Affiche tes contrats actifs en tant que mercenaire avec leur progression.

---

## 🔍 CATÉGORIE : LOOKING FOR GROUP (LFG)

*LFG signifie "Looking For Group" — chercher des coéquipiers pour jouer ensemble.*

---

### `/lfg creer <jeu> [description] [joueurs] [durée]`

**Ce que ça fait** : Publie une annonce pour trouver des partenaires de jeu. L'annonce affiche un bouton **Rejoindre** et se ferme automatiquement quand toutes les places sont prises ou à expiration.

**Paramètres** :
- `<jeu>` *(obligatoire)* — Nom du jeu.
- `[description]` *(optionnel)* — Précisions : mode de jeu, rang requis, objectif… (max 200 caractères).
- `[joueurs]` *(optionnel)* — Nombre de places total (2 à 20). Défaut : 4.
- `[durée]` *(optionnel)* — Durée en heures (1 à 24h). Défaut : 3h.

**Exemple** :
```
/lfg creer jeu:Valorant description:"Ranked Diamond+, micro obligatoire" joueurs:5 duree:2
→ Annonce postée avec un bouton Rejoindre
→ 4 places restantes (tu occupes la 1ère)
```

**Règle** : Tu ne peux avoir **qu'un seul LFG actif** à la fois.

---

### `/lfg liste [jeu]`

**Ce que ça fait** : Affiche toutes les annonces LFG actives, avec filtre optionnel par jeu.

```
/lfg liste              → Toutes les annonces
/lfg liste jeu:Minecraft → Uniquement Minecraft
```

---

## 🤖 CATÉGORIE : IA & RECHERCHE

*Nexus est propulsé par Gemini, l'IA de Google. Il a une personnalité de rival gaming — compétitif, sarcastique, mais utile.*

---

### Parler à Nexus (sans commande)

**Ce que ça fait** : Tu peux parler directement à Nexus de trois façons :
1. **Mentionner le bot** : `@Nexus c'est quoi le meilleur build Warframe ?`
2. **Répondre à un de ses messages** : Clique sur "Répondre" sur n'importe quel message du bot
3. **Écrire dans le salon IA dédié** (si configuré par un admin) : Tous tes messages reçoivent une réponse

**Mémoire** : Nexus se souvient du contexte de la conversation pendant **2 heures**. Après ça, il repart de zéro.

**Exemples** :
```
@Nexus qui est le meilleur personnage dans Smash Bros Ultimate ?
→ "Sans discussion, c'est Steve. Mais bon, toi tu joues probablement Pikachu donc..."

@Nexus c'est quoi le patch notes de la dernière mise à jour de Valorant ?
→ Nexus cherche sur le web et résume les changements récents
```

---

### `/recherche <requête>`

**Ce que ça fait** : Effectue une recherche sur le web et te livre un résumé intelligent dans un embed Discord, avec les sources cliquables.

**Exemple** :
```
/recherche patch notes Warframe mai 2025
→ Résumé IA des derniers changements
→ 📎 Sources : [Warframe.com], [Warframe Wiki], ...
```

**Utilité** : Pratique pour chercher des infos sans quitter Discord — prix de jeux, dates de sortie, tier lists, news gaming…

---

## 🎌 CATÉGORIE : ANILIST

*AniList est un site de suivi d'animes. Ces commandes connectent ton profil AniList à Nexus pour afficher tes stats.*

---

### `/register <pseudo_anilist>`

**Ce que ça fait** : Lie ton compte AniList à ton profil Discord. À faire une seule fois. Nexus vérifie en direct que le pseudo existe sur AniList.co.

**Exemple** :
```
/register Kira_Animes
→ Ton Discord est maintenant associé à [Kira_Animes] sur AniList !
```

**Prérequis** : Avoir un compte sur [anilist.co](https://anilist.co). C'est gratuit.

---

### `/aniboard`

**Ce que ça fait** : Affiche le classement des membres du serveur selon leur **temps de visionnage d'anime total**, récupéré depuis AniList en temps réel. Inclut aussi le nombre d'épisodes regardés et d'animes terminés.

**Exemple** :
```
/aniboard
→ 🎌 Classement AniList — Mon Serveur
   🥇 @Kira — ⏱ 87j 14h · 📺 12 450 épisodes · ✅ 340 animes
   🥈 @Mako — ⏱ 54j 3h · ...
   ⏱ Totaux du serveur : 210 jours cumulés · 890 animes terminés
```

---

## 🛡️ CATÉGORIE : MODÉRATION

*Commandes réservées aux membres avec la permission **Modérer des membres**.*

---

### `/warn add @membre [raison]`
### `/warn list @membre`
### `/warn clear @membre`

**Ce que ça fait** : Système d'avertissements progressifs avec sanctions automatiques. Chaque warn est enregistré avec la date, la raison et le modérateur.

**Seuils automatiques** :
- **3 warns** → Mute automatique pendant **1 heure**
- **5 warns** → Mute automatique pendant **24 heures**
- **7 warns** → Alerte aux admins pour envisager un kick

`/warn add @membre [raison]` → Ajouter un avertissement.
```
/warn add @user raison:"Spam de messages"
→ ⚠️ 1 warn ajouté. Total : 2/3
```

`/warn list @membre` → Voir l'historique des warns avec dates et raisons.

`/warn clear @membre` → Effacer tous les avertissements d'un membre (pardon admin). Remet aussi le compteur à zéro.

---

## ⚙️ CATÉGORIE : ADMINISTRATION

*Commandes réservées aux membres avec la permission **Gérer le serveur**.*

---

### `/autopost status`
### `/autopost recap on/off`
### `/autopost rss on/off`
### `/autopost notif on/off`
### `/autopost rappel on/off`

**Ce que ça fait** : Contrôle total sur les messages automatiques que le bot envoie sans qu'on le lui demande.

`/autopost status` → Vue d'ensemble de l'état de tous les automatismes.

| Sous-commande | Ce qu'elle contrôle |
|---|---|
| `recap on/off` | Classement XP posté toutes les 6h |
| `rss on/off` | Mises à jour de patch notes jeux (Warframe, Genshin…) |
| `notif on/off` | Message quand un membre lance un jeu |
| `rappel on/off` | Rappels planifiés |

---

### `/ai salon [canal]`
### `/ai reset <portée>`
### `/ai statut`

**Ce que ça fait** : Gestion du système IA de Nexus.

`/ai salon #canal` → Définit un salon où Nexus répond à **tous** les messages (pas seulement les mentions).
```
/ai salon #ia-nexus
→ Nexus répondra désormais à tous les messages dans #ia-nexus
```

`/ai salon` *(sans canal)* → Désactive le salon dédié.

`/ai reset ce-salon` → Efface l'historique de conversation IA de ce salon (Nexus repart de zéro).

`/ai reset tout-le-serveur` → Efface tous les historiques (à utiliser si le bot semble "perdre le fil").

`/ai statut` → Affiche l'état du système : modèle Gemini actif, backend de recherche, salon IA configuré.

---

### `/event start [durée]`
### `/event stop`

**Ce que ça fait** : Lance un **événement XP ×2**. Pendant toute la durée de l'événement, chaque action qui rapporte de l'XP en rapporte **le double**.

```
/event start duree:60
→ ⚡ Événement XP ×2 lancé pour 60 minutes !
→ Tous les gains XP sont doublés.

/event stop
→ Le multiplicateur est revenu à la normale.
```

---

### `/notif on/off/status`

**Ce que ça fait** : Active ou désactive les messages de notification de présence (le bot annonce quand un membre lance un jeu).

---

### `/rappel on/off/set/status`

**Ce que ça fait** : Gère les rappels automatiques — messages envoyés à heures régulières dans un canal défini.

`/rappel set <message>` → Modifie le texte du rappel.
`/rappel on` → Active les rappels pour 24h.
`/rappel off` → Désactive.
`/rappel status` → Voir l'état et le message actuel.

---

## ℹ️ CATÉGORIE : INFORMATIONS

---

### `/aide`

**Ce que ça fait** : Affiche un récapitulatif de toutes les commandes disponibles, organisé par catégorie. Point d'entrée pour les nouveaux membres.

---

### `/stats [@membre]`

**Ce que ça fait** : Affiche les statistiques détaillées de temps de jeu d'un membre — quels jeux, combien de sessions, combien de temps total.

```
/stats @Kira
→ 🎮 Stats gaming de Kira
   Valorant : 47h de jeu · 23 sessions
   Minecraft : 31h · 12 sessions
   ...
```

---

## 🎭 BADGES SHADOW — Les Succès Secrets

*Ces badges n'apparaissent pas dans `/badges`. Personne ne connaît les conditions exactes… jusqu'à ce que quelqu'un les débloque et que ça devienne une légende sur le serveur.*

Il en existe au moins 5. Leurs conditions générales sont connues, mais pas les détails exacts — à toi de tester des comportements inhabituels pour les découvrir.

| Badge | Indice vague |
|---|---|
| 👻 Le Fantôme | L'absence prolongée suivie d'un retour remarqué |
| 💀 Skill Issue Certifié | Perdre, encore et encore, très vite |
| 🌙 Insomniaque Certifié | Être actif à des heures où les sages dorment |
| 🐋 Baleine | Dépenser sans compter en boutique |
| 🗿 Le Contre | Voter systématiquement contre tout |

---

## 🔊 VOCAL — Salons Temporaires & Territoires

*Aucune commande n'est nécessaire — tout est automatique.*

**Salons temporaires** : Si un administrateur a configuré un salon "Hub" vocal, il suffit de le rejoindre. Nexus crée automatiquement un salon vocal privé à ton nom (avec le tag de ton clan si tu en as un), et tu y es déplacé. Le salon est supprimé automatiquement quand il se vide.

**Capture de territoire** : Quand un clan est majoritaire dans un salon temporaire, il le "contrôle". Chaque minute de contrôle rapporte **+2 XP** au clan. Si un autre clan débarque en force et prend la majorité, le salon est **renommé à leurs couleurs** et ils commencent à engranger l'XP à leur tour.

---

*Documentation générée pour Nexus v2.0 — Discord.js v14 · MongoDB · Gemini AI*
