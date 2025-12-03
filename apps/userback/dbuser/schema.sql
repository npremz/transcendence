-- Comptes utilisateurs (garde la compatibilité avec ta table actuelle)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                     -- UUID/ULID/42_id
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,                      -- si auth locale (sinon NULL)
    github_id TEXT UNIQUE,                   -- si auth GitHub OAuth
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME,
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_github ON users(github_id);

-- Sessions pour l'authentification (validation côté serveur)
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,                -- UUID depuis le cookie player_session
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                        -- Expiration optionnelle (NULL = pas d'expiration)
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Réglages/Préférences (chat & vie privée)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    friend_requests TEXT NOT NULL
        CHECK(friend_requests IN ('everyone','friends_of_friends','none')) DEFAULT 'everyone',
    read_receipts_enabled BOOLEAN NOT NULL DEFAULT 1,
    notifications_enabled BOOLEAN NOT NULL DEFAULT 1,
    language TEXT DEFAULT 'fr',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Présence/Status léger (peut être en mémoire côté serveur, mais DB utile pour audit)
CREATE TABLE IF NOT EXISTS user_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('online','offline','busy','away')) DEFAULT 'offline',
    status_message TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- RELATIONS : AMITIÉS / BLOCS
-- ===========================================

-- Amitiés symétriques : on impose user_a < user_b pour unicité simple
CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a TEXT NOT NULL,        -- lexicographically smaller id
    user_b TEXT NOT NULL,        -- lexicographically larger id
    status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined','removed')) DEFAULT 'pending',
    requested_by TEXT NOT NULL,  -- qui a initié la demande
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    CHECK (user_a < user_b),
    FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_requested_by ON friendships(requested_by);

-- Blocages (unilatéral)
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- CHAT : CONVERSATIONS / MEMBRES / MESSAGES
-- ===========================================

-- Conversations : DM, groupe, ou associée à une partie (chat de match)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,   -- UUID/ULID
    type TEXT NOT NULL CHECK(type IN ('dm','group','match')),
    title TEXT,            -- nom pour groupes
    created_by TEXT,       -- créateur (NULL possible pour 'match' créé système)
    game_id TEXT,          -- optionnel : relie au match (si tu veux le chat de partie)
    is_archived BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_game ON conversations(game_id);

-- Pour garantir 1 seul DM par paire d’utilisateurs, on cartographie la paire -> conversation
CREATE TABLE IF NOT EXISTS dm_links (
    user_a TEXT NOT NULL,      -- plus petit id
    user_b TEXT NOT NULL,      -- plus grand id
    conversation_id TEXT NOT NULL UNIQUE,
    CHECK (user_a < user_b),
    PRIMARY KEY (user_a, user_b),
    FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dm_links_conv ON dm_links(conversation_id);

-- Membres de conversation (rôles + mutes + bans ciblés)
CREATE TABLE IF NOT EXISTS conversation_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','member')) DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    muted_until DATETIME,           -- mute temporel
    is_banned BOOLEAN NOT NULL DEFAULT 0,  -- bannissement dans la conv
    UNIQUE(conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

-- Messages (texte, système, réponses, pièces jointes légères)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,                    -- UUID/ULID
    conversation_id TEXT NOT NULL,
    sender_id TEXT,                         -- NULL possible pour messages système
    type TEXT NOT NULL CHECK(type IN ('text','system')),
    content TEXT,                           -- pour 'text'; pour 'system', payload court
    reply_to_message_id TEXT,               -- fil de réponses (optionnel)
    attachment_url TEXT,                    -- si tu héberges des assets
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME,
    deleted_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Accusés de lecture (read receipts)
CREATE TABLE IF NOT EXISTS message_reads (
    conversation_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, message_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reads_user ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_reads_conv ON message_reads(conversation_id);

-- Modération ciblée (optionnel si tu veux un historique des bans/kicks)
CREATE TABLE IF NOT EXISTS conversation_moderation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('mute','unmute','ban','unban','kick')),
    action_by TEXT,  -- admin qui a effectué l’action
    reason TEXT,
    until DATETIME,  -- pour mute temp
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_mod_conv ON conversation_moderation(conversation_id);

-- ===========================================
-- RECHERCHE PLEIN TEXTE (SQLite FTS5) SUR LES MESSAGES
-- ===========================================

-- Table virtuelle FTS liée aux messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts
USING fts5(
    content,
    message_id UNINDEXED,
    conversation_id UNINDEXED,
    sender_id UNINDEXED,
    created_at UNINDEXED,
    tokenize = 'unicode61'
);

-- Triggers pour synchroniser FTS
CREATE TRIGGER IF NOT EXISTS trg_messages_ai AFTER INSERT ON messages
BEGIN
  INSERT INTO messages_fts(content, message_id, conversation_id, sender_id, created_at)
  VALUES (NEW.content, NEW.id, NEW.conversation_id, NEW.sender_id, NEW.created_at);
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_au AFTER UPDATE ON messages
BEGIN
  DELETE FROM messages_fts WHERE message_id = OLD.id;
  INSERT INTO messages_fts(content, message_id, conversation_id, sender_id, created_at)
  VALUES (NEW.content, NEW.id, NEW.conversation_id, NEW.sender_id, NEW.created_at);
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_ad AFTER DELETE ON messages
BEGIN
  DELETE FROM messages_fts WHERE message_id = OLD.id;
END;

-- ===========================================
-- VUES PRATIQUES
-- ===========================================

-- Vue : conversations DM avec les deux membres & leur état d’amitié
CREATE VIEW IF NOT EXISTS v_dm_conversations AS
SELECT
  c.id            AS conversation_id,
  d.user_a,
  d.user_b,
  f.status        AS friendship_status,
  c.created_at
FROM dm_links d
JOIN conversations c ON c.id = d.conversation_id
LEFT JOIN friendships f
  ON f.user_a = d.user_a AND f.user_b = d.user_b;

-- Vue : dernier message par conversation
CREATE VIEW IF NOT EXISTS v_conversation_last_message AS
SELECT m1.*
FROM messages m1
JOIN (
    SELECT conversation_id, MAX(created_at) AS max_created
    FROM messages
    GROUP BY conversation_id
) mm
ON m1.conversation_id = mm.conversation_id AND m1.created_at = mm.max_created;

-- ===========================================
-- CHAT GLOBAL PUBLIC
-- ===========================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
