# Migration vers JWT

## Pour les bases de données existantes

Si vous avez déjà une base de données `users.db` en production, suivez ces étapes pour migrer vers le nouveau système JWT.

## Option 1 : Migration automatique (recommandé)

### Script de migration

Créer un fichier `migrate-to-jwt.ts` :

```typescript
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'users.db');

async function migrate() {
  const db = new sqlite3.Database(DB_FILE);

  console.log('🔄 Migration vers JWT...');

  // Lire les nouvelles tables depuis le schéma
  const newTables = `
    -- Refresh tokens pour l'authentification JWT
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        user_agent TEXT,
        ip_address TEXT,
        is_revoked BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

    -- Blacklist pour les tokens révoqués
    CREATE TABLE IF NOT EXISTS token_blacklist (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_type TEXT NOT NULL CHECK(token_type IN ('access','refresh')),
        revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at);
    CREATE INDEX IF NOT EXISTS idx_blacklist_user ON token_blacklist(user_id);
  `;

  return new Promise((resolve, reject) => {
    db.exec(newTables, (err) => {
      if (err) {
        console.error('❌ Erreur de migration:', err);
        reject(err);
      } else {
        console.log('✅ Migration réussie !');
        console.log('   - Table refresh_tokens créée');
        console.log('   - Table token_blacklist créée');
        console.log('   - Index créés');
        resolve(true);
      }
      db.close();
    });
  });
}

migrate().catch(console.error);
```

### Exécuter la migration

```bash
cd apps/userback
npx tsx migrate-to-jwt.ts
```

## Option 2 : Migration manuelle

### 1. Backup de la base de données

```bash
cd apps/userback
cp data/users.db data/users.db.backup
```

### 2. Ajouter les nouvelles tables

Ouvrir la base de données avec sqlite3 :

```bash
sqlite3 data/users.db
```

Exécuter les commandes SQL :

```sql
-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    user_agent TEXT,
    ip_address TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Token blacklist
CREATE TABLE IF NOT EXISTS token_blacklist (
    jti TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_type TEXT NOT NULL CHECK(token_type IN ('access','refresh')),
    revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_blacklist_user ON token_blacklist(user_id);

-- Vérifier les tables
.tables

-- Quitter
.quit
```

## Option 3 : Nouvelle base de données (développement)

Si vous êtes en développement et que vous pouvez perdre les données :

```bash
cd apps/userback
rm -f data/users.db
npm start  # La base sera recréée avec le nouveau schéma
```

## Vérification de la migration

### 1. Vérifier les tables

```bash
sqlite3 data/users.db "SELECT name FROM sqlite_master WHERE type='table';"
```

Vous devriez voir :
- users
- user_settings
- user_presence
- friendships
- user_blocks
- conversations
- dm_links
- conversation_members
- messages
- message_reads
- conversation_moderation
- messages_fts
- chat_messages
- **refresh_tokens** ← Nouvelle
- **token_blacklist** ← Nouvelle

### 2. Tester l'authentification

```bash
# Créer un utilisateur
curl -X POST http://localhost:3060/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testmigration","password":"Test123"}'

# Login
curl -X POST http://localhost:3060/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testmigration","password":"Test123"}'
```

Si vous recevez un `accessToken` et un `refreshToken`, la migration est réussie ! ✅

## Rollback (en cas de problème)

Si la migration échoue, restaurer le backup :

```bash
cd apps/userback
rm data/users.db
cp data/users.db.backup data/users.db
```

## Compatibilité

### Anciennes routes

Les anciennes routes continuent de fonctionner :
- ✅ `POST /users` - Création d'utilisateur (inchangé)
- ✅ `GET /users` - Liste des utilisateurs (maintenant protégé par JWT)

### Nouvelles routes

Les nouvelles routes JWT sont disponibles :
- ✅ `POST /auth/login` - Connexion
- ✅ `POST /auth/refresh` - Rafraîchir le token
- ✅ `POST /auth/logout` - Déconnexion
- ✅ `GET /auth/me` - Informations utilisateur

## Impact sur les clients

### Frontend

Le frontend doit être mis à jour pour :
1. Appeler `/auth/login` au lieu de vérifier directement le mot de passe
2. Stocker les tokens (localStorage ou cookies)
3. Envoyer le token dans le header `Authorization: Bearer <token>`
4. Gérer le refresh des tokens expirés

### Autres services

Les autres services backend (chatback, gameback, etc.) doivent :
1. Installer `@fastify/jwt`
2. Configurer avec le même secret JWT
3. Valider les tokens sur les routes protégées

Voir `INTEGRATION.md` pour plus de détails.

## Checklist de migration

- [ ] Backup de la base de données
- [ ] Exécution du script de migration
- [ ] Vérification des nouvelles tables
- [ ] Test de création d'utilisateur
- [ ] Test de login
- [ ] Test d'accès aux routes protégées
- [ ] Test de refresh token
- [ ] Test de logout
- [ ] Mise à jour du frontend
- [ ] Mise à jour des autres services
- [ ] Configuration des variables d'environnement
- [ ] Tests d'intégration complets

## Support

En cas de problème, consulter :
- `AUTH_README.md` - Documentation de l'API
- `INTEGRATION.md` - Guide d'intégration
- `SECURITY_SUMMARY.md` - Résumé de la sécurité
- `test-auth.sh` - Script de test

Ou ouvrir une issue sur le projet.
