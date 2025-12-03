# Userback DB – accès et inspection rapide

## Localisation du fichier SQLite
- Host : `apps/userback/data/users.db`
- Dans le conteneur : `/userback/data/users.db`

## Accès direct (sqlite3)
Si `sqlite3` est dispo dans l’image :
```
docker compose exec userback sqlite3 /userback/data/users.db "SELECT id, username, avatar_url, total_games, total_wins, total_losses FROM users LIMIT 10;"
```
Chat :
```
docker compose exec userback sqlite3 /userback/data/users.db "SELECT id, username, content, created_at FROM chat_messages ORDER BY id DESC LIMIT 20;"
```
Friendships :
```
docker compose exec userback sqlite3 /userback/data/users.db "SELECT * FROM friendships LIMIT 10;"
```

## Accès API (via nginx)
- Créer un user : `POST https://<host>/userback/users` body `{ "username": "...", "password": "..." }`
- Login : `POST https://<host>/userback/users/login` body `{ "username": "...", "password": "..." }`
- User basique : `GET https://<host>/userback/users?username=<name>`
- Détails complets (temp admin) : `GET https://<host>/userback/admin/users/details?username=<name>`  
  Renvoie la ligne complète `users` (avatar_url, stats…), settings, présence, friendships.
- Chat :
  - Historique : `GET https://<host>/userback/chat/messages`
  - Envoyer : `POST https://<host>/userback/chat/messages` body `{ "username": "...", "content": "..." }`
  - WS temps réel : `wss://<host>/userback/chat`

## Vue admin temporaire (front)
`https://<host>/admin/users` permet de voir les détails d’un utilisateur (mêmes infos que l’API admin).

## Données couvertes & comment les afficher/récupérer
- Profil (stats, avatar) : table `users`  
  - API rapide : `/userback/users?username=alice` (id, username, dates).  
  - API complète : `/userback/admin/users/details?username=alice` (avatar_url, total_games/wins/losses, timestamps).
  - SQL : `SELECT username, avatar_url, total_games, total_wins, total_losses FROM users WHERE username='alice';`
- Paramètres : table `user_settings` (friend_requests, notifications, langue).  
  - Inclus dans `/admin/users/details` ; sinon SQL direct :  
    `SELECT * FROM user_settings WHERE user_id=(SELECT id FROM users WHERE username='alice');`
- Présence : table `user_presence` (status, status_message, updated_at).  
  - Inclus dans `/admin/users/details` ; sinon SQL direct.
- Amis : table `friendships` (status pending/accepted/declined/removed).  
  - Inclus dans `/admin/users/details` ; sinon SQL direct :  
    ```
    SELECT * FROM friendships
    WHERE user_a=(SELECT id FROM users WHERE username='alice')
       OR user_b=(SELECT id FROM users WHERE username='alice');
    ```
- Chat global : table `chat_messages`  
  - API : `/userback/chat/messages` (historique), `/userback/chat/messages` en POST pour ajouter, WS `wss://<host>/userback/chat`.
  - SQL : voir section “Accès direct”.

### Pour réutiliser les données dans le front (ex. stats, profil, amis)
1. API recommandée :  
   - Stats/avatar de base : `/userback/users?username=...` (minimal)  
   - Profil complet + stats + amis + présence + settings : `/userback/admin/users/details?username=...`
2. SQL interne (debug/outillage) : lire directement dans `users`, `friendships`, `chat_messages`, etc., depuis `apps/userback/data/users.db`.

Tout ce qui est stocké est déjà exposé par `/userback/admin/users/details?username=...` ou les routes chat ; pas d’autres endpoints nécessaires pour afficher les stats, l’avatar, les amis ou l’historique de chat.
