-- Partie persistante
CREATE TABLE IF NOT EXISTS games (
	if INTEGER PRIMARY KEY AUTOINCREMENT,
	player1_name TEXT NOT NULL,
	player2_name TEXT NOT NULL,
	player1_score INTEGER NOT NULL DEFAULT 0,
	player2_score INTEGER NOT NULL DEFAULT 0,
	duration INTEGER NOT NULL DEFAULT 0, -- secondes
	status TEXT NOT NULL DEFAULT 'active', -- 'active', 'finish'
	started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	finished_at DATETIME NULL
)

-- Chat global
CREATE TABLE IF NOT EXISTS global_messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL,
	content TEXT NOT NULL,
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Room chat (supp 10min apres la fin de game)
CREATE TABLE IF NOT EXISTS game_messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_id INTEGER NOT NULL,
	username TEXT NOT NULL,
	content TEXT NOT NULL,
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
)

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_messages_game_id ON game_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_game_messages_timestamp ON game_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_global_messages_timestamp ON global_messages(timestamp);
