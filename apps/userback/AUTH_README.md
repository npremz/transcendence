# API d'authentification JWT

## Configuration

### Variables d'environnement

Copier `.env.example` vers `.env` et configurer :

```bash
cp .env.example .env
```

**Important** : Générer un secret JWT fort en production :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Endpoints d'authentification

### 1. Inscription (POST /users)

Créer un nouveau compte utilisateur.

**Request:**
```json
{
  "username": "john_doe",
  "password": "MyPass123"
}
```

**Validation:**
- Username : 3-20 caractères
- Password : minimum 6 caractères, 1 chiffre, 1 majuscule

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "john_doe"
  }
}
```

### 2. Connexion (POST /auth/login)

Authentifier un utilisateur et obtenir les tokens JWT.

**Rate limit:** 5 requêtes/minute

**Request:**
```json
{
  "username": "john_doe",
  "password": "MyPass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid-refresh-token",
  "expiresIn": "15m",
  "user": {
    "id": "uuid",
    "username": "john_doe"
  }
}
```

**Tokens:**
- **Access Token** : Durée de vie 15 minutes, à inclure dans le header `Authorization`
- **Refresh Token** : Durée de vie 7 jours, à stocker de manière sécurisée

### 3. Rafraîchir le token (POST /auth/refresh)

Obtenir un nouvel access token avec un refresh token valide.

**Rate limit:** 10 requêtes/minute

**Request:**
```json
{
  "refreshToken": "uuid-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m"
}
```

### 4. Déconnexion (POST /auth/logout)

Révoquer le refresh token et blacklister l'access token actuel.

**Authentification requise**

**Request:**
```json
{
  "refreshToken": "uuid-refresh-token"
}
```

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 5. Déconnexion de tous les appareils (POST /auth/logout-all)

Révoquer tous les refresh tokens de l'utilisateur.

**Authentification requise**

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out from 3 device(s)"
}
```

### 6. Informations utilisateur (GET /auth/me)

Obtenir les informations de l'utilisateur connecté.

**Authentification requise**

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "avatar_url": null,
    "created_at": "2025-11-28T10:00:00.000Z",
    "last_seen": "2025-11-28T12:30:00.000Z",
    "total_games": 42,
    "total_wins": 25,
    "total_losses": 17
  }
}
```

## Routes protégées

Les routes suivantes nécessitent maintenant une authentification :

- `GET /users` - Liste des utilisateurs
- `GET /users?username=xxx` - Détails d'un utilisateur
- `GET /admin/users/details` - Détails complets (admin)

**Headers requis:**
```
Authorization: Bearer <access-token>
```

## Utilisation dans le client

### Exemple avec fetch (JavaScript)

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3060/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'MyPass123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Stocker les tokens (localStorage, sessionStorage, ou cookie sécurisé)
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 2. Requête authentifiée
const response = await fetch('http://localhost:3060/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// 3. Gérer l'expiration du token
if (response.status === 401) {
  // Rafraîchir le token
  const refreshResponse = await fetch('http://localhost:3060/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });
  
  const { accessToken: newAccessToken } = await refreshResponse.json();
  localStorage.setItem('accessToken', newAccessToken);
  
  // Réessayer la requête
  // ...
}

// 4. Logout
await fetch('http://localhost:3060/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

## Sécurité

### Bonnes pratiques implémentées

✅ **Hachage des mots de passe** : PBKDF2 avec 120 000 itérations
✅ **Tokens JWT signés** : HS256 avec secret fort
✅ **Access tokens courts** : 15 minutes pour limiter l'exposition
✅ **Refresh tokens longs** : 7 jours avec stockage en base
✅ **Blacklist des tokens** : Révocation immédiate lors du logout
✅ **Rate limiting** : Protection contre le brute force
✅ **CORS configuré** : Contrôle des origines autorisées
✅ **Timing-safe comparison** : Protection contre les timing attacks
✅ **Nettoyage automatique** : Suppression des tokens expirés

### Recommandations supplémentaires

- 🔒 Utiliser HTTPS en production
- 🔒 Stocker les refresh tokens dans des cookies HttpOnly
- 🔒 Implémenter une rotation des refresh tokens
- 🔒 Ajouter une authentification à deux facteurs (2FA)
- 🔒 Logger les tentatives de connexion suspectes
- 🔒 Implémenter un système de rôles (admin, user, etc.)

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400  | Requête invalide (paramètres manquants) |
| 401  | Non authentifié (token invalide/expiré) |
| 403  | Accès refusé (permissions insuffisantes) |
| 404  | Ressource non trouvée |
| 409  | Conflit (username déjà existant) |
| 429  | Trop de requêtes (rate limit) |
| 500  | Erreur serveur |

## Base de données

### Tables ajoutées

**refresh_tokens** : Stockage des refresh tokens
- `id` : UUID du token
- `user_id` : Référence à l'utilisateur
- `token_hash` : Hash SHA-256 du token
- `expires_at` : Date d'expiration
- `is_revoked` : Statut de révocation
- `user_agent`, `ip_address` : Tracking des devices

**token_blacklist** : Tokens révoqués
- `jti` : JWT ID (claim jti)
- `user_id` : Référence à l'utilisateur
- `token_type` : 'access' ou 'refresh'
- `expires_at` : Pour nettoyage automatique
- `reason` : Raison de la révocation

## Tests

Voir le fichier de tests pour des exemples complets.
