import { randomUUID, createHash } from 'crypto';
import type sqlite3 from 'sqlite3';

export interface TokenPayload {
	userId: string;
	username: string;
	jti: string;
}

export interface RefreshTokenData {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	userAgent?: string;
	ipAddress?: string;
}

/**
 * Hash un refresh token pour le stockage sécurisé
 */
export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/**
 * Génère un JTI (JWT ID) unique
 */
export function generateJti(): string {
	return randomUUID();
}

/**
 * Stocke un refresh token dans la base de données
 */
export function storeRefreshToken(
	db: sqlite3.Database,
	data: RefreshTokenData
): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[
				data.id,
				data.userId,
				data.tokenHash,
				data.expiresAt.toISOString(),
				data.userAgent || null,
				data.ipAddress || null
			],
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
 * Vérifie si un refresh token existe et est valide
 */
export function verifyRefreshToken(
	db: sqlite3.Database,
	tokenHash: string
): Promise<{ userId: string; id: string } | null> {
	return new Promise((resolve, reject) => {
		db.get(
			`SELECT id, user_id, expires_at, is_revoked 
			 FROM refresh_tokens 
			 WHERE token_hash = ? AND is_revoked = 0`,
			[tokenHash],
			(err, row: any) => {
				if (err) {
					reject(err);
					return;
				}

				if (!row) {
					resolve(null);
					return;
				}

				const expiresAt = new Date(row.expires_at);
				if (expiresAt < new Date()) {
					resolve(null);
					return;
				}

				resolve({ userId: row.user_id, id: row.id });
			}
		);
	});
}

/**
 * Met à jour la date de dernière utilisation d'un refresh token
 */
export function updateRefreshTokenUsage(
	db: sqlite3.Database,
	tokenId: string
): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(
			`UPDATE refresh_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`,
			[tokenId],
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
 * Révoque un refresh token
 */
export function revokeRefreshToken(
	db: sqlite3.Database,
	tokenHash: string
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.run(
			`UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?`,
			[tokenHash],
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
 * Révoque tous les refresh tokens d'un utilisateur
 */
export function revokeAllUserTokens(
	db: sqlite3.Database,
	userId: string
): Promise<number> {
	return new Promise((resolve, reject) => {
		db.run(
			`UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0`,
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
 * Ajoute un token à la blacklist
 */
export function blacklistToken(
	db: sqlite3.Database,
	jti: string,
	userId: string,
	tokenType: 'access' | 'refresh',
	expiresAt: Date,
	reason?: string
): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(
			`INSERT INTO token_blacklist (jti, user_id, token_type, expires_at, reason)
			 VALUES (?, ?, ?, ?, ?)`,
			[jti, userId, tokenType, expiresAt.toISOString(), reason || null],
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
 * Vérifie si un token est blacklisté
 */
export function isTokenBlacklisted(
	db: sqlite3.Database,
	jti: string
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.get(
			`SELECT 1 FROM token_blacklist WHERE jti = ?`,
			[jti],
			(err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(!!row);
				}
			}
		);
	});
}

/**
 * Nettoie les tokens expirés (à exécuter périodiquement)
 */
export function cleanupExpiredTokens(db: sqlite3.Database): Promise<number> {
	return new Promise((resolve, reject) => {
		const now = new Date().toISOString();
		
		db.run(
			`DELETE FROM refresh_tokens WHERE expires_at < ?`,
			[now],
			function(err) {
				if (err) {
					reject(err);
					return;
				}

				const deletedRefresh = this.changes;

				db.run(
					`DELETE FROM token_blacklist WHERE expires_at < ?`,
					[now],
					function(err) {
						if (err) {
							reject(err);
						} else {
							resolve(deletedRefresh + this.changes);
						}
					}
				);
			}
		);
	});
}
