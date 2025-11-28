# Intégration JWT avec les autres services

## Vue d'ensemble

Le service `userback` fournit maintenant une authentification JWT complète. Les autres services (chatback, gameback, tournamentback, etc.) doivent valider les tokens JWT pour sécuriser leurs endpoints.

## Architecture

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. Login
       ▼
┌─────────────┐
│  userback   │ ──► Génère Access Token + Refresh Token
└──────┬──────┘
       │ 2. Token JWT
       ▼
┌─────────────┐
│  chatback   │ ──► Valide le token JWT
│  gameback   │
│ tournament  │
└─────────────┘
```

## Configuration des autres services

### 1. Installation des dépendances

Dans chaque service backend (chatback, gameback, etc.) :

```bash
npm install @fastify/jwt
```

### 2. Configuration JWT

Ajouter dans chaque `server.ts` :

```typescript
import jwt from '@fastify/jwt';

// Même secret que userback (via variable d'environnement)
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

await fastify.register(jwt, {
  secret: jwtSecret,
  sign: {
    algorithm: 'HS256'
  }
});
```

### 3. Middleware de validation

Créer un middleware `middleware/auth.ts` dans chaque service :

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  userId: string;
  username: string;
  jti: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}
```

### 4. Protéger les routes

#### Exemple pour chatback

```typescript
import { authenticateJWT } from './middleware/auth';

// WebSocket avec authentification
fastify.get('/ws', { 
  websocket: true,
  preHandler: authenticateJWT 
}, function chatHandler(socket, req) {
  const user = req.user; // { userId, username, jti }
  handleChat(socket, req, fastify, user);
});
```

#### Exemple pour gameback

```typescript
import { authenticateJWT } from './middleware/auth';

fastify.post('/create', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  const user = request.user!;
  // Vérifier que l'utilisateur est bien un des joueurs
  // ...
});
```

### 5. Variables d'environnement

Ajouter dans le `.env` global ou dans chaque service :

```bash
JWT_SECRET=<même-secret-que-userback>
```

**Important** : Tous les services doivent utiliser le **même secret JWT** pour pouvoir valider les tokens.

## Flux d'authentification complet

### 1. Frontend - Login

```javascript
// Login
const response = await fetch('http://localhost:3060/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice', password: 'Alice123' })
});

const { accessToken, refreshToken } = await response.json();

// Stocker les tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### 2. Frontend - Connexion WebSocket (Chat)

```javascript
const token = localStorage.getItem('accessToken');

// Envoyer le token dans le header ou en query param
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

// OU dans le premier message
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: token
  }));
};
```

### 3. Backend - Validation WebSocket

Pour les WebSockets, deux approches :

#### Approche A : Token dans l'URL (query param)

```typescript
fastify.get('/ws', { websocket: true }, async (socket, req) => {
  const token = req.query.token as string;
  
  if (!token) {
    socket.close(1008, 'Token required');
    return;
  }

  try {
    const decoded = fastify.jwt.verify(token) as JWTPayload;
    handleChat(socket, req, fastify, decoded);
  } catch (err) {
    socket.close(1008, 'Invalid token');
  }
});
```

#### Approche B : Token dans le premier message

```typescript
fastify.get('/ws', { websocket: true }, (socket, req) => {
  let authenticated = false;
  let user: JWTPayload | null = null;

  socket.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    if (!authenticated) {
      if (message.type === 'auth') {
        try {
          user = fastify.jwt.verify(message.token) as JWTPayload;
          authenticated = true;
          socket.send(JSON.stringify({ type: 'auth_success' }));
        } catch (err) {
          socket.close(1008, 'Invalid token');
        }
      } else {
        socket.close(1008, 'Authentication required');
      }
      return;
    }

    // Traiter les messages authentifiés
    handleMessage(message, user!);
  });
});
```

## Gestion des tokens expirés

### Frontend - Intercepteur de requêtes

```javascript
async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('accessToken');
  
  // Première tentative
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  // Si token expiré, rafraîchir
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const refreshResponse = await fetch('http://localhost:3060/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken: newToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', newToken);
      
      // Réessayer avec le nouveau token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        }
      });
    } else {
      // Refresh token invalide, rediriger vers login
      window.location.href = '/login';
    }
  }

  return response;
}
```

## Vérification de l'identité utilisateur

Pour les actions sensibles, vérifier que l'utilisateur accède à ses propres ressources :

```typescript
fastify.post('/game/:gameId/action', {
  preHandler: authenticateJWT
}, async (request, reply) => {
  const { gameId } = request.params;
  const user = request.user!;

  // Récupérer le jeu
  const game = await getGame(gameId);

  // Vérifier que l'utilisateur est un joueur du jeu
  if (game.player1Id !== user.userId && game.player2Id !== user.userId) {
    return reply.status(403).send({
      success: false,
      error: 'You are not a player in this game'
    });
  }

  // Traiter l'action
  // ...
});
```

## Sécurité - Checklist

### Pour chaque service

- [ ] Installer `@fastify/jwt`
- [ ] Configurer avec le même secret JWT
- [ ] Créer le middleware d'authentification
- [ ] Protéger toutes les routes sensibles
- [ ] Valider les tokens dans les WebSockets
- [ ] Vérifier l'identité utilisateur pour les actions
- [ ] Gérer les erreurs 401 (token invalide/expiré)
- [ ] Logger les tentatives d'accès non autorisées

### Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
# JWT Secret (MÊME pour tous les services)
JWT_SECRET=<générer-avec-crypto.randomBytes(64).toString('hex')>

# CORS
CORS_ORIGIN=http://localhost:5173

# Ports des services
PORT_USERBACK=3060
PORT_CHATBACK=3000
PORT_GAMEBACK=3010
PORT_QUICKPLAYBACK=3030
PORT_TOURNAMENTBACK=3040
PORT_BLOCKCHAINBACK=3070
```

## Communication inter-services

Si un service doit appeler un autre service (ex: gameback → userback), deux options :

### Option 1 : Service-to-service token

Créer un token spécial pour les communications inter-services :

```typescript
// Dans userback, créer un endpoint pour les services
fastify.post('/auth/service-token', {
  preHandler: validateServiceSecret
}, async (request, reply) => {
  const serviceToken = fastify.jwt.sign(
    { service: 'gameback', type: 'service' },
    { expiresIn: '1h' }
  );
  return { token: serviceToken };
});
```

### Option 2 : Appels internes sans authentification

Si les services sont dans un réseau privé (Docker), autoriser les appels depuis certaines IPs :

```typescript
fastify.addHook('onRequest', async (request, reply) => {
  const internalIPs = ['172.18.0.0/16', '127.0.0.1'];
  const clientIP = request.ip;
  
  if (isInternalIP(clientIP, internalIPs)) {
    request.isInternalCall = true;
  }
});
```

## Tests d'intégration

Exemple de test pour vérifier l'intégration :

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3060/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"Alice123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# 2. Utiliser le token sur un autre service
curl -X POST http://localhost:3010/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test","player1":{"id":"..."},"player2":{"id":"..."}}'
```

## Monitoring et logs

Ajouter des logs pour tracer les authentifications :

```typescript
fastify.addHook('onRequest', async (request, reply) => {
  if (request.user) {
    fastify.log.info({
      userId: request.user.userId,
      username: request.user.username,
      method: request.method,
      url: request.url
    }, 'Authenticated request');
  }
});
```

## Prochaines étapes

1. **Implémenter l'authentification dans chatback**
2. **Implémenter l'authentification dans gameback**
3. **Implémenter l'authentification dans tournamentback**
4. **Implémenter l'authentification dans quickplayback**
5. **Mettre à jour le frontend** pour gérer les tokens
6. **Tester l'intégration complète**
7. **Ajouter des rôles** (admin, user, moderator)
8. **Implémenter 2FA** (optionnel)
