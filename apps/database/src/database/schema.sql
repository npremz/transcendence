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

-- Index pour les recherches fréquentes (vérifie aussi l'existence)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Table des tournois
CREATE TABLE IF NOT EXISTS tournaments (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	max_players INTEGER NOT NULL,
	status TEXT NOT NULL CHECK(status IN ('registration', 'in_progress', 'finished')),
	winner_id TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	started_at DATETIME,
	finished_at DATETIME,
	current_round INTEGER DEFAULT 0,
	FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON tournaments(created_at);

-- Table des inscriptions aux tournois
CREATE TABLE IF NOT EXISTS tournament_registrations (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id TEXT NOT NULL,
	player_id TEXT NOT NULL,
	registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	is_eliminated BOOLEAN DEFAULT 0,
	final_position INTEGER,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
	FOREIGN KEY (player_id) REFERENCES users(id),
	UNIQUE(tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_player ON tournament_registrations(player_id);

-- Table des parties (quickplay ET matches de tournoi)
CREATE TABLE IF NOT EXISTS games (
	id TEXT PRIMARY KEY,
	room_id TEXT NOT NULL UNIQUE,
	game_type TEXT NOT NULL CHECK(game_type IN ('quickplay', 'tournament')),
	tournament_id TEXT,
	tournament_round INTEGER,
	match_position INTEGER,
	player_left_id TEXT NOT NULL,
	player_right_id TEXT NOT NULL,
	score_left INTEGER DEFAULT 0,
	score_right INTEGER DEFAULT 0,
	winner_id TEXT,
	status TEXT NOT NULL CHECK(status IN ('waiting', 'in_progress', 'finished', 'abandoned')),
	end_reason TEXT CHECK(end_reason IN ('score', 'timeout', 'forfeit')),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	started_at DATETIME,
	finished_at DATETIME,
	duration_seconds INTEGER,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
	FOREIGN KEY (player_left_id) REFERENCES users(id),
	FOREIGN KEY (player_right_id) REFERENCES users(id),
	FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_games_room ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_games_player_left ON games(player_left_id);
CREATE INDEX IF NOT EXISTS idx_games_player_right ON games(player_right_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Table des statistiques détaillées de partie
CREATE TABLE IF NOT EXISTS game_stats (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_id TEXT NOT NULL,
	player_id TEXT NOT NULL,
	side TEXT NOT NULL CHECK(side IN ('left', 'right')),
	paddle_hits INTEGER DEFAULT 0,
	max_ball_speed REAL DEFAULT 0,
	power_ups_collected INTEGER DEFAULT 0,
	skills_used INTEGER DEFAULT 0,
	time_disconnected_ms INTEGER DEFAULT 0,
	FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
	FOREIGN KEY (player_id) REFERENCES users(id),
	UNIQUE(game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_stats_game ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_player ON game_stats(player_id);

-- Table des power-ups collectés et activés
CREATE TABLE IF NOT EXISTS power_ups_used (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_id TEXT NOT NULL,
	player_id TEXT NOT NULL,
	power_up_type TEXT NOT NULL CHECK(power_up_type IN ('split', 'blackout', 'blackhole')),
	collected_at_game_time REAL,
	activated_at_game_time REAL NOT NULL,
	activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
	FOREIGN KEY (player_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_powerups_game ON power_ups_used(game_id);
CREATE INDEX IF NOT EXISTS idx_powerups_player ON power_ups_used(player_id);
CREATE INDEX IF NOT EXISTS idx_powerups_type ON power_ups_used(power_up_type);

-- Table des skills utilisés
CREATE TABLE IF NOT EXISTS skills_used (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_id TEXT NOT NULL,
	player_id TEXT NOT NULL,
	skill_type TEXT NOT NULL CHECK(skill_type IN ('smash')),
	activated_at_game_time REAL NOT NULL,
	activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	was_successful BOOLEAN DEFAULT 1,
	FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
	FOREIGN KEY (player_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_skills_game ON skills_used(game_id);
CREATE INDEX IF NOT EXISTS idx_skills_player ON skills_used(player_id);
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills_used(skill_type);

-- Table des goals marqués (pour heatmap)
CREATE TABLE IF NOT EXISTS goals_scored (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_id TEXT NOT NULL,
	scorer_side TEXT NOT NULL CHECK(scorer_side IN ('left', 'right')),
	scored_against_side TEXT NOT NULL CHECK(scored_against_side IN ('left', 'right')),
	ball_y_position REAL NOT NULL,
	scored_at_game_time REAL NOT NULL,
	scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goals_game ON goals_scored(game_id);
CREATE INDEX IF NOT EXISTS idx_goals_scorer ON goals_scored(scorer_side);
