# Database Service API Documentation

## Vue d'ensemble

Service de base de données centralisé pour Transcendence, exposant une API REST pour gérer les utilisateurs, tournois, parties et statistiques.

**Port:** `3020`  
**Base de données:** SQLite  
**Localisation DB:** `./apps/database/data/transcendence.db`

---

## Table des matières

1. [Installation & Démarrage](#installation--démarrage)
2. [Architecture](#architecture)
3. [Routes API](#routes-api)
   - [Users](#users)
   - [Tournaments](#tournaments)
   - [Tournament Registrations](#tournament-registrations)
   - [Games](#games)
   - [Game Stats](#game-stats)
   - [Power-ups](#power-ups)
4. [Exemples d'utilisation](#exemples-dutilisation)
5. [Gestion des erreurs](#gestion-des-erreurs)
6. [Tests](#tests)

---

## Installation & Démarrage

### Prérequis
```bash
Node.js >= 18
npm ou pnpm
```

### Installation
```bash
cd apps/database
npm install
```

### Démarrage
```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

### Vérification
```bash
curl http://localhost:3020/health
# Réponse attendue:
# {"status":"ok","timestamp":"2025-01-XX...","service":"database"}
```

---

## Architecture

```
apps/database/
├── src/
│   ├── database/
│   │   ├── connection.ts    # Gestion connexion SQLite
│   │   └── schema.sql       # Schéma de la base
│   ├── routes/
│   │   ├── users.ts
│   │   ├── tournaments.ts
│   │   ├── tournament-registrations.ts
│   │   ├── games.ts
│   │   ├── game-stats.ts
│   │   └── power-ups.ts
│   └── server.ts            # Point d'entrée
├── data/
│   └── transcendence.db     # Base SQLite (générée auto)
└── package.json
```

---

## Routes API

### Health Check

**GET** `/health`

Vérifie que le service est opérationnel.

**Réponse:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-07T10:30:00.000Z",
  "service": "database"
}
```

---

## Users

### Créer un utilisateur

**POST** `/users`

**Body:**
```json
{
  "id": "uuid-v4",
  "username": "player1"
}
```

**Réponses:**
- `200` - Succès
  ```json
  {
    "success": true,
    "user": {
      "id": "uuid-v4",
      "username": "player1"
    }
  }
  ```
- `400` - Champs manquants
- `409` - Username déjà pris
- `500` - Erreur serveur

---

### Récupérer un utilisateur par ID

**GET** `/users/:id`

**Paramètres:**
- `id` (path) - UUID de l'utilisateur

**Réponse:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-v4",
    "username": "player1",
    "created_at": "2025-01-07T10:00:00.000Z",
    "last_seen": "2025-01-07T12:00:00.000Z",
    "total_games": 42,
    "total_wins": 25,
    "total_losses": 17
  }
}
```

**Erreurs:**
- `404` - Utilisateur introuvable
- `500` - Erreur serveur

---

### Rechercher par username ou lister tous

**GET** `/users?username=player1`

**Query params (optionnel):**
- `username` - Recherche exacte

**Sans paramètre:** Retourne les 100 derniers utilisateurs

**Réponse (avec username):**
```json
{
  "success": true,
  "user": { /* ... */ }
}
```

**Réponse (sans paramètre):**
```json
{
  "success": true,
  "users": [
    { /* user 1 */ },
    { /* user 2 */ }
  ]
}
```

---

### Mettre à jour last_seen

**PATCH** `/users/:id/last-seen`

Met à jour automatiquement le timestamp `last_seen` à `CURRENT_TIMESTAMP`.

**Réponse:**
```json
{
  "success": true
}
```

**Erreurs:**
- `404` - Utilisateur introuvable

---

### Incrémenter les statistiques

**PATCH** `/users/:id/stats`

**Body:**
```json
{
  "won": true
}
```

Incrémente automatiquement:
- `total_games` (+1)
- `total_wins` (+1 si `won: true`)
- `total_losses` (+1 si `won: false`)
- Met à jour `last_seen`

**Réponse:**
```json
{
  "success": true
}
```

---

### Leaderboard

**GET** `/users/leaderboard`

Retourne le top 50 des joueurs classés par victoires et win rate.

**Réponse:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "id": "uuid-1",
      "username": "champion",
      "total_games": 100,
      "total_wins": 80,
      "total_losses": 20,
      "win_rate": 80.00
    }
  ]
}
```

---

## Tournaments

### Créer un tournoi

**POST** `/tournaments`

**Body:**
```json
{
  "id": "uuid-v4",
  "name": "4p",
  "max_players": 4
}
```

**Réponse:**
```json
{
  "success": true,
  "tournament": {
    "id": "uuid-v4",
    "name": "4p",
    "max_players": 4,
    "status": "registration"
  }
}
```

---

### Récupérer un tournoi

**GET** `/tournaments/:id`

**Réponse:**
```json
{
  "success": true,
  "tournament": {
    "id": "uuid-v4",
    "name": "4p",
    "max_players": 4,
    "status": "in_progress",
    "current_round": 2,
    "winner_id": null,
    "created_at": "2025-01-07T10:00:00.000Z",
    "started_at": "2025-01-07T10:15:00.000Z",
    "finished_at": null
  }
}
```

---

### Lister les tournois actifs

**GET** `/tournaments`

Retourne les tournois en `registration` ou `in_progress`.

**Réponse:**
```json
{
  "success": true,
  "tournaments": [
    { /* tournament 1 */ },
    { /* tournament 2 */ }
  ]
}
```

---

### Démarrer un tournoi

**PATCH** `/tournaments/:id/start`

Change le statut à `in_progress`, définit `started_at` et `current_round = 1`.

**Conditions:**
- Le tournoi doit être en statut `registration`

**Réponse:**
```json
{
  "success": true
}
```

**Erreurs:**
- `400` - Tournoi déjà démarré ou introuvable

---

### Terminer un tournoi

**PATCH** `/tournaments/:id/finish`

**Body:**
```json
{
  "winner_id": "uuid-player"
}
```

Change le statut à `finished`, définit `finished_at` et `winner_id`.

**Réponse:**
```json
{
  "success": true
}
```

---

### Avancer au round suivant

**PATCH** `/tournaments/:id/next-round`

Incrémente `current_round` de 1.

**Conditions:**
- Le tournoi doit être `in_progress`

**Réponse:**
```json
{
  "success": true
}
```

---

## Tournament Registrations

### Inscrire un joueur

**POST** `/tournament-registrations`

**Body:**
```json
{
  "tournament_id": "uuid-tournament",
  "player_id": "uuid-player"
}
```

**Réponse:**
```json
{
  "success": true,
  "registration_id": 123
}
```

**Erreurs:**
- `409` - Joueur déjà inscrit (contrainte UNIQUE)

---

### Lister les joueurs d'un tournoi

**GET** `/tournament-registrations/tournament/:tournamentId`

**Réponse:**
```json
{
  "success": true,
  "registrations": [
    {
      "id": 1,
      "tournament_id": "uuid-tournament",
      "player_id": "uuid-player",
      "username": "player1",
      "registered_at": "2025-01-07T10:00:00.000Z",
      "is_eliminated": false,
      "final_position": null
    }
  ]
}
```

---

### Éliminer un joueur

**PATCH** `/tournament-registrations/tournament/:tournamentId/player/:playerId/eliminate`

**Body (optionnel):**
```json
{
  "final_position": 3
}
```

Définit `is_eliminated = 1` et optionnellement `final_position`.

**Réponse:**
```json
{
  "success": true
}
```

---

### Désinscrire un joueur

**DELETE** `/tournament-registrations/tournament/:tournamentId/player/:playerId`

**Conditions:**
- Le tournoi doit être en statut `registration`

**Réponse:**
```json
{
  "success": true
}
```

**Erreurs:**
- `400` - Tournoi déjà démarré

---

## Games

### Créer une partie

**POST** `/games`

**Body:**
```json
{
  "id": "uuid-game",
  "room_id": "uuid-room",
  "game_type": "quickplay",
  "player_left_id": "uuid-player1",
  "player_right_id": "uuid-player2",
  "tournament_id": null,
  "tournament_round": null,
  "match_position": null
}
```

**Pour un match de tournoi:**
```json
{
  "id": "uuid-game",
  "room_id": "uuid-room",
  "game_type": "tournament",
  "player_left_id": "uuid-player1",
  "player_right_id": "uuid-player2",
  "tournament_id": "uuid-tournament",
  "tournament_round": 1,
  "match_position": 0
}
```

**Réponse:**
```json
{
  "success": true,
  "game": {
    "id": "uuid-game",
    "room_id": "uuid-room",
    "status": "waiting"
  }
}
```

---

### Récupérer une partie par room_id

**GET** `/games/room/:roomId`

**Réponse:**
```json
{
  "success": true,
  "game": {
    "id": "uuid-game",
    "room_id": "uuid-room",
    "game_type": "quickplay",
    "player_left_id": "uuid-player1",
    "player_right_id": "uuid-player2",
    "player_left_username": "player1",
    "player_right_username": "player2",
    "score_left": 11,
    "score_right": 9,
    "winner_id": "uuid-player1",
    "winner_username": "player1",
    "status": "finished",
    "end_reason": "score",
    "created_at": "2025-01-07T10:00:00.000Z",
    "started_at": "2025-01-07T10:05:00.000Z",
    "finished_at": "2025-01-07T10:15:00.000Z",
    "duration_seconds": 600
  }
}
```

---

### Démarrer une partie

**PATCH** `/games/room/:roomId/start`

Change le statut à `in_progress` et définit `started_at`.

**Conditions:**
- La partie doit être en statut `waiting`

**Réponse:**
```json
{
  "success": true
}
```

---

### Terminer une partie

**PATCH** `/games/room/:roomId/finish`

**Body:**
```json
{
  "score_left": 11,
  "score_right": 9,
  "winner_id": "uuid-player1",
  "end_reason": "score"
}
```

**end_reason:** `"score"`, `"timeout"`, ou `"forfeit"`

Change le statut à `finished`, enregistre les scores, définit `finished_at` et calcule automatiquement `duration_seconds`.

**Réponse:**
```json
{
  "success": true
}
```

---

### Historique d'un joueur

**GET** `/games/player/:playerId/history`

Retourne les 50 dernières parties du joueur.

**Réponse:**
```json
{
  "success": true,
  "games": [
    {
      "id": "uuid-game",
      "room_id": "uuid-room",
      "player_left_username": "player1",
      "player_right_username": "player2",
      "score_left": 11,
      "score_right": 9,
      "result": "won",
      "created_at": "2025-01-07T10:00:00.000Z"
    }
  ]
}
```

**Champ `result`:** `"won"`, `"lost"`, ou `"ongoing"`

---

## Game Stats

### Enregistrer les stats d'une partie

**POST** `/game-stats`

**Body:**
```json
{
  "game_id": "uuid-game",
  "player_id": "uuid-player",
  "side": "left",
  "paddle_hits": 42,
  "smashes_used": 3,
  "max_ball_speed": 1450.5,
  "power_ups_collected": 2,
  "time_disconnected_ms": 0
}
```

**Réponse:**
```json
{
  "success": true,
  "stat_id": 123
}
```

---

### Stats d'une partie

**GET** `/game-stats/game/:gameId`

**Réponse:**
```json
{
  "success": true,
  "stats": [
    {
      "id": 1,
      "game_id": "uuid-game",
      "player_id": "uuid-player",
      "username": "player1",
      "side": "left",
      "paddle_hits": 42,
      "smashes_used": 3,
      "max_ball_speed": 1450.5,
      "power_ups_collected": 2,
      "time_disconnected_ms": 0
    }
  ]
}
```

---

### Stats agrégées d'un joueur

**GET** `/game-stats/player/:playerId/aggregate`

**Réponse:**
```json
{
  "success": true,
  "aggregate_stats": {
    "total_games": 42,
    "total_paddle_hits": 1764,
    "total_smashes": 126,
    "highest_ball_speed": 1500.0,
    "total_power_ups": 84,
    "avg_paddle_hits": 42.0,
    "avg_smashes": 3.0
  }
}
```

---

## Power-ups

### Enregistrer l'utilisation d'un power-up

**POST** `/power-ups`

**Body:**
```json
{
  "game_id": "uuid-game",
  "player_id": "uuid-player",
  "power_up_type": "split",
  "activated_at_game_time": 45.3
}
```

**power_up_type:** `"split"`, `"blackout"`, ou `"blackhole"`

**Réponse:**
```json
{
  "success": true,
  "powerup_id": 123
}
```

---

### Power-ups d'une partie

**GET** `/power-ups/game/:gameId`

**Réponse:**
```json
{
  "success": true,
  "power_ups": [
    {
      "id": 1,
      "game_id": "uuid-game",
      "player_id": "uuid-player",
      "username": "player1",
      "power_up_type": "split",
      "activated_at_game_time": 45.3,
      "activated_at": "2025-01-07T10:10:45.000Z"
    }
  ]
}
```

---

### Stats power-ups d'un joueur

**GET** `/power-ups/player/:playerId/stats`

**Réponse:**
```json
{
  "success": true,
  "powerup_stats": [
    {
      "power_up_type": "split",
      "times_used": 42
    },
    {
      "power_up_type": "blackout",
      "times_used": 28
    },
    {
      "power_up_type": "blackhole",
      "times_used": 14
    }
  ]
}
```

---

## Exemples d'utilisation

### Scénario complet: Partie QuickPlay

```bash
# 1. Créer deux utilisateurs
curl -X POST http://localhost:3020/users \
  -H "Content-Type: application/json" \
  -d '{"id":"player1-uuid","username":"Alice"}'

curl -X POST http://localhost:3020/users \
  -H "Content-Type: application/json" \
  -d '{"id":"player2-uuid","username":"Bob"}'

# 2. Créer une partie
curl -X POST http://localhost:3020/games \
  -H "Content-Type: application/json" \
  -d '{
    "id":"game1-uuid",
    "room_id":"room1-uuid",
    "game_type":"quickplay",
    "player_left_id":"player1-uuid",
    "player_right_id":"player2-uuid"
  }'

# 3. Démarrer la partie
curl -X PATCH http://localhost:3020/games/room/room1-uuid/start

# 4. Enregistrer des power-ups
curl -X POST http://localhost:3020/power-ups \
  -H "Content-Type: application/json" \
  -d '{
    "game_id":"game1-uuid",
    "player_id":"player1-uuid",
    "power_up_type":"split",
    "activated_at_game_time":23.5
  }'

# 5. Terminer la partie
curl -X PATCH http://localhost:3020/games/room/room1-uuid/finish \
  -H "Content-Type: application/json" \
  -d '{
    "score_left":11,
    "score_right":9,
    "winner_id":"player1-uuid",
    "end_reason":"score"
  }'

# 6. Enregistrer les stats
curl -X POST http://localhost:3020/game-stats \
  -H "Content-Type: application/json" \
  -d '{
    "game_id":"game1-uuid",
    "player_id":"player1-uuid",
    "side":"left",
    "paddle_hits":52,
    "smashes_used":4,
    "max_ball_speed":1420.3,
    "power_ups_collected":3
  }'

# 7. Mettre à jour les stats utilisateur
curl -X PATCH http://localhost:3020/users/player1-uuid/stats \
  -H "Content-Type: application/json" \
  -d '{"won":true}'

curl -X PATCH http://localhost:3020/users/player2-uuid/stats \
  -H "Content-Type: application/json" \
  -d '{"won":false}'

# 8. Consulter le leaderboard
curl http://localhost:3020/users/leaderboard
```

---

### Scénario: Tournoi

```bash
# 1. Créer un tournoi
curl -X POST http://localhost:3020/tournaments \
  -H "Content-Type: application/json" \
  -d '{
    "id":"tournament1-uuid",
    "name":"4p",
    "max_players":4
  }'

# 2. Inscrire des joueurs
curl -X POST http://localhost:3020/tournament-registrations \
  -H "Content-Type: application/json" \
  -d '{
    "tournament_id":"tournament1-uuid",
    "player_id":"player1-uuid"
  }'

# (répéter pour 3 autres joueurs)

# 3. Démarrer le tournoi
curl -X PATCH http://localhost:3020/tournaments/tournament1-uuid/start

# 4. Créer un match de tournoi
curl -X POST http://localhost:3020/games \
  -H "Content-Type: application/json" \
  -d '{
    "id":"match1-uuid",
    "room_id":"room-match1-uuid",
    "game_type":"tournament",
    "player_left_id":"player1-uuid",
    "player_right_id":"player2-uuid",
    "tournament_id":"tournament1-uuid",
    "tournament_round":1,
    "match_position":0
  }'

# 5. Après le match, éliminer le perdant
curl -X PATCH http://localhost:3020/tournament-registrations/tournament/tournament1-uuid/player/player2-uuid/eliminate \
  -H "Content-Type: application/json" \
  -d '{"final_position":3}'

# 6. Avancer au round suivant
curl -X PATCH http://localhost:3020/tournaments/tournament1-uuid/next-round

# 7. Terminer le tournoi
curl -X PATCH http://localhost:3020/tournaments/tournament1-uuid/finish \
  -H "Content-Type: application/json" \
  -d '{"winner_id":"player1-uuid"}'
```

---

## Gestion des erreurs

### Format des réponses d'erreur

```json
{
  "success": false,
  "error": "Description de l'erreur"
}
```

### Codes HTTP

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `400` | Requête invalide (champs manquants, conditions non remplies) |
| `404` | Ressource introuvable |
| `409` | Conflit (contrainte UNIQUE violée) |
| `500` | Erreur serveur interne |

### Erreurs courantes

**Champs manquants:**
```json
{
  "success": false,
  "error": "id and username are required"
}
```

**Contrainte UNIQUE:**
```json
{
  "success": false,
  "error": "Username already exists"
}
```

**Ressource introuvable:**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Condition non remplie:**
```json
{
  "success": false,
  "error": "Game not found or already started"
}
```

---

## Tests

Voir le fichier `test-database-api.sh` pour une suite de tests complète.

### Lancer les tests

```bash
cd apps/database
chmod +x test-database-api.sh
./test-database-api.sh
```

Le script teste:
- ✅ Création et récupération d'utilisateurs
- ✅ Mise à jour des stats
- ✅ Leaderboard
- ✅ Création et gestion de tournois
- ✅ Inscriptions et éliminaisons
- ✅ Création et suivi de parties
- ✅ Enregistrement de stats détaillées
- ✅ Tracking des power-ups
- ✅ Gestion des erreurs (409, 404, 400)

---

## Notes importantes

### Contraintes de base de données

**Users:**
- `username` doit être unique
- `id` est la clé primaire (UUID recommandé)

**Tournaments:**
- `status` doit être: `registration`, `in_progress`, ou `finished`

**Games:**
- `room_id` doit être unique
- `game_type` doit être: `quickplay` ou `tournament`
- `end_reason` doit être: `score`, `timeout`, ou `forfeit`

**Tournament Registrations:**
- Combinaison `(tournament_id, player_id)` doit être unique
- Suppression en cascade si le tournoi est supprimé

**Game Stats:**
- Combinaison `(game_id, player_id)` doit être unique
- `side` doit être: `left` ou `right`

**Power-ups:**
- `power_up_type` doit être: `split`, `blackout`, ou `blackhole`

### Performance

- Index créés sur les colonnes fréquemment recherchées
- Limite de 100 résultats pour les listes sans filtres
- Limite de 50 pour les leaderboards et historiques

### Calculs automatiques

**Games:**
- `duration_seconds` calculé automatiquement lors du finish (différence entre `started_at` et `finished_at`)

**Users leaderboard:**
- `win_rate` calculé dynamiquement: `(total_wins / total_games) * 100`

---

## Utilisation du script de test

```bash
# Rendre le script exécutable
chmod +x apps/database/test-database-api.sh

# Lancer les tests
cd apps/database
./test-database-api.sh
```

**Le script teste:**
- ✅ Toutes les routes CRUD
- ✅ Les contraintes UNIQUE (409 Conflict)
- ✅ Les ressources inexistantes (404 Not Found)
- ✅ Les champs manquants (400 Bad Request)
- ✅ Les calculs automatiques (duration_seconds, win_rate)
- ✅ Les jointures SQL (usernames dans les réponses)
- ✅ Les limites de résultats
