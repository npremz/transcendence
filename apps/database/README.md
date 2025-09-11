# API de Base de Données pour le Jeu

Ce service est une API backend construite avec **Fastify** et **SQLite** pour gérer les données d'un jeu, incluant les parties, les scores et les messages de chat.

## Table des Matières

1.  [Technologies Utilisées](#technologies-utilisées)
2.  [Installation et Lancement](#installation-et-lancement)
3.  [Structure de la Base de Données](#structure-de-la-base-de-données)
    -   [Table `games`](#table-games)
    -   [Table `global_messages`](#table-global_messages)
    -   [Table `game_messages`](#table-game_messages)
    -   [Les Index](#les-index)
4.  [Documentation de l'API (Endpoints)](#documentation-de-lapi-endpoints)
    -   [Health Check](#health-check)
    -   [Messages Globaux](#messages-globaux)
    -   [Messages de Partie](#messages-de-partie)
    -   [Gestion des Parties (Games)](#gestion-des-parties-games)
5.  [Comment Contribuer ?](#comment-contribuer-)
    -   [Ajouter des Données (via les Endpoints)](#ajouter-des-données-via-les-endpoints)
    -   [Ajouter un Nouvel Endpoint](#ajouter-un-nouvel-endpoint)
6.  [Gestion des Erreurs](#gestion-des-erreurs)

## Technologies Utilisées

*   **Framework Backend :** [Fastify](https://www.fastify.io/) - Un framework web pour Node.js, très performant et avec une faible surcharge.
*   **Base de Données :** [SQLite3](https://www.sqlite.org/index.html) - Une base de données SQL légère, basée sur des fichiers, parfaite pour le développement et les applications de petite à moyenne envergure.
*   **Langage :** [TypeScript](https://www.typescriptlang.org/) - Un sur-ensemble de JavaScript qui ajoute un typage statique pour un code plus robuste.

## Installation et Lancement

Pour faire tourner ce service sur ta machine, suis ces étapes :

1.  **Cloner le dépôt** (si ce n'est pas déjà fait).

2.  **Installer les dépendances**
    Assure-toi d'avoir Node.js et npm installés. Ensuite, à la racine du projet, lance :
    ```bash
    npm install
    ```

3.  **Lancer le serveur**
    La commande suivante démarrera l'API, qui sera accessible sur `http://localhost:3020`.
    ```bash
    npm run start 
    ```
    *(Vérifie le script `start` dans ton fichier `package.json` si cette commande ne fonctionne pas).*

## Structure de la Base de Données

La base de données est conçue pour stocker les informations essentielles sur les parties et les communications.

### Table `games`

Cette table contient les informations persistantes sur chaque partie jouée.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Identifiant unique de la partie (clé primaire). |
| `player1_name` | `TEXT` | Nom du joueur 1. |
| `player2_name` | `TEXT` | Nom du joueur 2. |
| `player1_score` | `INTEGER` | Score du joueur 1 (défaut : 0). |
| `player2_score` | `INTEGER` | Score du joueur 2 (défaut : 0). |
| `duration` | `INTEGER` | Durée de la partie en secondes (défaut : 0). |
| `status` | `TEXT` | Statut de la partie (`active`, `finished`, etc.). |
| `started_at` | `DATETIME` | Horodatage du début de la partie. |
| `finished_at`| `DATETIME` | Horodatage de la fin de la partie (peut être `NULL`). |

### Table `global_messages`

Utilisée pour le chat global, accessible à tous les utilisateurs connectés, indépendamment des parties.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Identifiant unique du message. |
| `username` | `TEXT` | Nom de l'utilisateur qui a envoyé le message. |
| `content` | `TEXT` | Contenu du message. |
| `timestamp` | `DATETIME` | Horodatage de l'envoi du message. |

### Table `game_messages`

Utilisée pour le chat spécifique à une partie. Les messages sont liés à une `game_id`. La `FOREIGN KEY` avec `ON DELETE CASCADE` assure que si une partie est supprimée, tous les messages associés le sont aussi.

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Identifiant unique du message. |
| `game_id` | `INTEGER` | Clé étrangère liant le message à une partie dans la table `games`. |
| `username` | `TEXT` | Nom de l'utilisateur qui a envoyé le message. |
| `content` | `TEXT` | Contenu du message. |
| `timestamp` | `DATETIME` | Horodatage de l'envoi du message. |

### Les Index

Les index (`idx_...`) sont des optimisations pour accélérer les recherches fréquentes sur les colonnes `status`, `game_id` et `timestamp`.

## Documentation de l'API (Endpoints)

Tous les endpoints sont préfixés par `/api`.

### Health Check

*   **`GET /health`**
    *   **Description :** Vérifie que le service est en ligne et fonctionnel.
    *   **Réponse :**
        ```json
        {
          "status": "ok",
          "timestamp": "2025-09-11T10:00:00.000Z",
          "service": "database"
        }
        ```

### Messages Globaux

Endpoints préfixés par `/api/messages`.

*   **`GET /global`**
    *   **Description :** Récupère les derniers messages du chat global.
    *   **Query Params (optionnel) :** `limit` (nombre, défaut : 50).
    *   **Réponse (Succès 200) :**
        ```json
        {
          "success": true,
          "data": [
            {
              "id": 1,
              "username": "player_one",
              "content": "Hello world!",
              "timestamp": "2025-09-11T09:59:00.000Z"
            }
          ]
        }
        ```

*   **`POST /global`**
    *   **Description :** Poste un nouveau message dans le chat global.
    *   **Body (JSON) :**
        ```json
        {
          "username": "player_two",
          "content": "Hi there!"
        }
        ```
    *   **Réponse (Succès 201) :**
        ```json
        {
          "success": true,
          "data": {
            "id": 2,
            "username": "player_two",
            "content": "Hi there!",
            "timestamp": "2025-09-11T10:01:00.000Z"
          }
        }
        ```

### Messages de Partie

Endpoints préfixés par `/api/messages`.

*   **`GET /game/:gameId`**
    *   **Description :** Récupère les messages d'une partie. Si la partie est terminée depuis plus de 10 minutes, retourne un tableau vide.
    *   **Params URL :** `gameId` (ID de la partie).
    *   **Réponse (Succès 200) :**
        ```json
        {
          "success": true,
          "data": [
            {
              "id": 1,
              "game_id": 123,
              "username": "player1_name",
              "content": "Good luck!",
              "timestamp": "2025-09-11T10:02:00.000Z"
            }
          ]
        }
        ```

*   **`POST /game/:gameId`**
    *   **Description :** Poste un nouveau message dans le chat d'une partie.
    *   **Params URL :** `gameId` (ID de la partie).
    *   **Body (JSON) :**
        ```json
        {
          "username": "player2_name",
          "content": "You too!"
        }
        ```
    *   **Réponse (Succès 201) :**
        ```json
        {
          "success": true,
          "data": {
            "id": 2,
            "game_id": 123,
            "username": "player2_name",
            "content": "You too!",
            "timestamp": "2025-09-11T10:03:00.000Z"
          }
        }
        ```

### Gestion des Parties (Games)

*(Note : ces endpoints sont définis dans `routes/games.ts` et doivent être documentés ici de la même manière)*

*   **`GET /api/games`**
*   **`POST /api/games`**
*   **`GET /api/games/:id`**
*   **`PUT /api/games/:id`**

## Comment Contribuer ?

### Ajouter des Données (via les Endpoints)

Pour interagir avec la base de données, utilisez un client HTTP (comme `curl`, Postman, etc.) pour envoyer des requêtes aux endpoints de l'API.

**Exemple : Ajouter un message global avec `curl`**

```bash
curl -X POST http://localhost:3020/api/messages/global \
-H "Content-Type: application/json" \
-d '{"username": "new_user", "content": "Testing the API"}'
```

## Gestion des Erreurs

Le serveur est configuré pour intercepter les erreurs non gérées et renvoyer une réponse JSON standardisée avec un statut 500.

*	Réponse d'erreur générique :

```json
{
  "success": false,
  "error": "Internal server error"
}
```
