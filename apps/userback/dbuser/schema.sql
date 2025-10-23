-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	username TEXT NOT NULL UNIQUE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	last_seen DATETIME,
	total_games INTEGER DEFAULT 0,
	total_wins INTEGER DEFAULT 0,
	total_losses INTEGER DEFAULT 0
);