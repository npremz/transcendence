import type sqlite3 from 'sqlite3';

export interface Session {
	session_id: string;
	user_id: string;
	created_at: string;
	expires_at: string | null;
	last_activity: string;
}

export interface SessionValidationResult {
	valid: boolean;
	session?: Session;
	user?: {
		id: string;
		username: string;
	};
}

/**
 * Crée une nouvelle session pour un utilisateur
 */
export function createSession(
	db: sqlite3.Database,
	sessionId: string,
	userId: string,
	expiresInDays: number | null = null
): Promise<void> {
	return new Promise((resolve, reject) => {
		const expiresAt = expiresInDays
			? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
			: null;

		db.run(
			`INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
			[sessionId, userId, expiresAt],
			(err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			}
		);
	});
}

/**
 * Valide une session et retourne les informations utilisateur si valide
 */
export function validateSession(
	db: sqlite3.Database,
	sessionId: string
): Promise<SessionValidationResult> {
	return new Promise((resolve) => {
		db.get(
			`SELECT s.*, u.username
			 FROM sessions s
			 JOIN users u ON s.user_id = u.id
			 WHERE s.session_id = ?
			 AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))`,
			[sessionId],
			(err, row: any) => {
				if (err || !row) {
					resolve({ valid: false });
					return;
				}

				// Mettre à jour last_activity
				db.run(
					`UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?`,
					[sessionId],
					() => {}
				);

				resolve({
					valid: true,
					session: {
						session_id: row.session_id,
						user_id: row.user_id,
						created_at: row.created_at,
						expires_at: row.expires_at,
						last_activity: row.last_activity
					},
					user: {
						id: row.user_id,
						username: row.username
					}
				});
			}
		);
	});
}

/**
 * Supprime une session (logout)
 */
export function deleteSession(
	db: sqlite3.Database,
	sessionId: string
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.run(
			`DELETE FROM sessions WHERE session_id = ?`,
			[sessionId],
			function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes > 0);
				}
			}
		);
	});
}

/**
 * Supprime toutes les sessions d'un utilisateur
 */
export function deleteAllUserSessions(
	db: sqlite3.Database,
	userId: string
): Promise<number> {
	return new Promise((resolve, reject) => {
		db.run(
			`DELETE FROM sessions WHERE user_id = ?`,
			[userId],
			function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			}
		);
	});
}

/**
 * Nettoie les sessions expirées (à appeler périodiquement)
 */
export function cleanExpiredSessions(db: sqlite3.Database): Promise<number> {
	return new Promise((resolve, reject) => {
		db.run(
			`DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < datetime('now')`,
			[],
			function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			}
		);
	});
}
