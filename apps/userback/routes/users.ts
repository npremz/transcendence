import { randomBytes, randomUUID, pbkdf2Sync, timingSafeEqual } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { createSession, validateSession, deleteSession } from '../sessionManager';
import { requireSession } from '../middleware/sessionAuth';

type CreateUserBody = {
	username?: string;
	password?: string;
};

function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const iterations = 120000;
	const digest = 'sha512';
	const hash = pbkdf2Sync(password, salt, iterations, 64, digest).toString('hex');

	return `pbkdf2$${digest}$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash?: string | null): boolean {
	if (!storedHash) {
		return false;
	}

	const parts = storedHash.split('$');
	if (parts.length !== 5 || parts[0] !== 'pbkdf2') {
		return false;
	}

	const [, digest, iterationsStr, salt, expectedHash] = parts;
	const iterations = Number(iterationsStr);
	if (!digest || !iterations || !salt || !expectedHash) {
		return false;
	}

	try {
		const derived = pbkdf2Sync(password, salt, iterations, expectedHash.length / 2, digest).toString('hex');
		const expectedBuffer = Buffer.from(expectedHash, 'hex');
		const derivedBuffer = Buffer.from(derived, 'hex');

		if (expectedBuffer.length !== derivedBuffer.length) {
			return false;
		}

		return timingSafeEqual(expectedBuffer, derivedBuffer);
	} catch (error) {
		console.warn('Password verification failed', error);
		return false;
	}
}

export function registerUserRoutes(fastify: FastifyInstance): void {
	fastify.post<{ Body: CreateUserBody }>('/users', async (request, reply) => {
		const { username, password } = request.body || {};

		if (!username || !password) {
			return reply.status(400).send({
				success: false,
				error: 'username and password are required'
			});
		}

		if (username.length < 3 || username.length > 20) {
			return reply.status(400).send({
				success: false,
				error: 'username must be between 3 and 20 characters'
			});
		}

		const hasMinLength = password.length >= 6;
		const hasDigit = /\d/.test(password);
		const hasUpper = /[A-Z]/.test(password);

		if (!hasMinLength || !hasDigit || !hasUpper) {
			return reply.status(400).send({
				success: false,
				error: 'password must be at least 6 characters, include one digit and one uppercase letter'
			});
		}

		const id = randomUUID();
		const passwordHash = hashPassword(password);

		return new Promise((resolve) => {
			fastify.db.run(
				`INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)`,
				[id, username, passwordHash],
				function(err) {
					if (err) {
						const isConflict = err.message?.includes('UNIQUE constraint failed');
						resolve(reply.status(isConflict ? 409 : 500).send({
							success: false,
							error: isConflict ? 'username already exists' : err.message
						}));
						return;
					}

					resolve(reply.status(201).send({
						success: true,
						user: { id, username }
					}));
				}
			);
		});
	});

	fastify.post<{ Body: CreateUserBody }>('/users/login', async (request, reply) => {
		const { username, password } = request.body || {};

		if (!username || !password) {
			return reply.status(400).send({
				success: false,
				error: 'username and password are required'
			});
		}

		// Récupérer ou créer le sessionId
		let sessionId = request.cookies.player_session;
		if (!sessionId) {
			// Créer un nouveau UUID pour la session si le cookie n'existe pas
			sessionId = randomUUID();
			// Définir le cookie (30 jours)
			reply.setCookie('player_session', sessionId, {
				path: '/',
				maxAge: 30 * 24 * 60 * 60, // 30 jours en secondes
				sameSite: 'strict',
				httpOnly: false, // Le frontend doit pouvoir lire le cookie
				secure: true // HTTPS uniquement
			});
		}

		return new Promise((resolve) => {
			fastify.db.get(
				`SELECT id, username, password_hash FROM users WHERE username = ?`,
				[username],
				async (err, row) => {
					if (err) {
						resolve(reply.status(500).send({
							success: false,
							error: err.message
						}));
						return;
					}

					if (!row || !verifyPassword(password, row.password_hash)) {
						resolve(reply.status(401).send({
							success: false,
							error: 'invalid username or password'
						}));
						return;
					}

					// Mettre à jour last_seen
					fastify.db.run(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [row.id], () => {});

					// Créer la session en DB (expiration après 30 jours)
					try {
						await createSession(fastify.db, sessionId, row.id, 30);
						resolve(reply.send({
							success: true,
							user: { id: row.id, username: row.username }
						}));
					} catch (sessionErr: any) {
						// Si la session existe déjà (login multiple), on ignore l'erreur
						if (sessionErr.message?.includes('UNIQUE constraint failed')) {
							resolve(reply.send({
								success: true,
								user: { id: row.id, username: row.username }
							}));
						} else {
							fastify.log.error('Failed to create session:', sessionErr);
							resolve(reply.status(500).send({
								success: false,
								error: 'Login successful but session creation failed'
							}));
						}
					}
				}
			);
		});
	});

	// GET - Récupérer un utilisateur par username (ou liste récente)
	fastify.get<{ Querystring: { username?: string } }>('/users', async (request, reply) => {
		const { username } = request.query || {};

		if (username) {
			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT id, username, created_at, last_seen, avatar FROM users WHERE username = ?`,
					[username],
					(err, row) => {
						if (err) {
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
							return;
						}

						if (!row) {
							resolve(reply.status(404).send({
								success: false,
								error: 'user not found'
							}));
							return;
						}

						resolve(reply.send({
							success: true,
							user: row
						}));
					}
				);
			});
		}

		// Pas de filtre => on renvoie une petite liste pour inspection rapide
		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT id, username, created_at, last_seen FROM users ORDER BY created_at DESC LIMIT 50`,
				[],
				(err, rows) => {
					if (err) {
						resolve(reply.status(500).send({
							success: false,
							error: err.message
						}));
						return;
					}

					resolve(reply.send({
						success: true,
						users: rows
					}));
				}
			);
		});
	});

	// ADMIN - Détails complets d'un utilisateur (temporaire)
	fastify.get<{ Querystring: { username?: string } }>('/admin/users/details', async (request, reply) => {
		const { username } = request.query || {};

		if (!username) {
			return reply.status(400).send({ success: false, error: 'username is required' });
		}

		const getUser = () => new Promise((resolve) => {
			fastify.db.get(
				`SELECT * FROM users WHERE username = ?`,
				[username],
				(err, row) => {
					if (err) return resolve({ error: err.message });
					if (!row) return resolve(null);
					return resolve(row);
				}
			);
		});

		const getSettings = () => new Promise((resolve) => {
			fastify.db.get(
				`SELECT * FROM user_settings WHERE user_id = (SELECT id FROM users WHERE username = ?)`,
				[username],
				(err, row) => {
					if (err) return resolve({ error: err.message });
					return resolve(row || null);
				}
			);
		});

		const getPresence = () => new Promise((resolve) => {
			fastify.db.get(
				`SELECT * FROM user_presence WHERE user_id = (SELECT id FROM users WHERE username = ?)`,
				[username],
				(err, row) => {
					if (err) return resolve({ error: err.message });
					return resolve(row || null);
				}
			);
		});

		const getFriends = () => new Promise((resolve) => {
			fastify.db.all(
				`SELECT * FROM friendships WHERE user_a = (SELECT id FROM users WHERE username = ?) 
					OR user_b = (SELECT id FROM users WHERE username = ?)`,
				[username, username],
				(err, rows) => {
					if (err) return resolve({ error: err.message });
					return resolve(rows || []);
				}
			);
		});

		const [user, settings, presence, friends] = await Promise.all([
			getUser(),
			getSettings(),
			getPresence(),
			getFriends()
		]);

		if (!user || (user as any).error) {
			const errMsg = (user as any)?.error;
			return reply.status(errMsg ? 500 : 404).send({
				success: false,
				error: errMsg || 'user not found'
			});
		}

		return reply.send({
			success: true,
			user,
			settings: (settings as any)?.error ? null : settings,
			presence: (presence as any)?.error ? null : presence,
			friends: (friends as any)?.error ? [] : friends
		});
	});

	fastify.put<{ Body: { username: string; avatar: string } }>('/users/avatar', async (request, reply) => {
        const { username, avatar } = request.body;

        if (!username || !avatar) {
            return reply.status(400).send({ success: false, error: 'Missing fields' });
        }

        // Limitation simple de la taille (Base64) pour ne pas exploser la DB
        if (avatar.length > 500000) { // ~350KB
            return reply.status(400).send({ success: false, error: 'Image too large' });
        }

        return new Promise((resolve) => {
            fastify.db.run(
                `UPDATE users SET avatar = ? WHERE username = ?`,
                [avatar, username],
                function(err) {
                    if (err) {
                        resolve(reply.status(500).send({ success: false, error: err.message }));
                    } else if (this.changes === 0) {
                        resolve(reply.status(404).send({ success: false, error: 'User not found' }));
                    } else {
                        resolve(reply.send({ success: true }));
                    }
                }
            );
        });
    });

	// PUT /users/username - Changer le username
	fastify.put<{ Body: { currentUsername: string; newUsername: string } }>('/users/username', async (request, reply) => {
		const { currentUsername, newUsername } = request.body;

		if (!currentUsername || !newUsername) {
			return reply.status(400).send({
				success: false,
				error: 'currentUsername and newUsername are required'
			});
		}

		if (newUsername.length < 3 || newUsername.length > 20) {
			return reply.status(400).send({
				success: false,
				error: 'username must be between 3 and 20 characters'
			});
		}

		// Vérifier que le nouveau username n'est pas déjà pris
		return new Promise((resolve) => {
			fastify.db.get(
				`SELECT id FROM users WHERE username = ?`,
				[newUsername],
				(err, row) => {
					if (err) {
						resolve(reply.status(500).send({
							success: false,
							error: err.message
						}));
						return;
					}

					if (row) {
						resolve(reply.status(409).send({
							success: false,
							error: 'username already taken'
						}));
						return;
					}

					// Mettre à jour le username
					fastify.db.run(
						`UPDATE users SET username = ? WHERE username = ?`,
						[newUsername, currentUsername],
						function(err) {
							if (err) {
								resolve(reply.status(500).send({
									success: false,
									error: err.message
								}));
							} else if (this.changes === 0) {
								resolve(reply.status(404).send({
									success: false,
									error: 'user not found'
								}));
							} else {
								resolve(reply.send({
									success: true,
									username: newUsername
								}));
							}
						}
					);
				}
			);
		});
	});

	// GET /users/check-availability - Vérifier si un username est disponible
	fastify.get<{ Querystring: { username: string } }>('/users/check-availability', async (request, reply) => {
		const { username } = request.query;

		if (!username) {
			return reply.status(400).send({
				success: false,
				error: 'username is required'
			});
		}

		return new Promise((resolve) => {
			fastify.db.get(
				`SELECT id FROM users WHERE username = ?`,
				[username],
				(err, row) => {
					if (err) {
						resolve(reply.status(500).send({
							success: false,
							error: err.message
						}));
						return;
					}

					resolve(reply.send({
						success: true,
						available: !row
					}));
				}
			);
		});
	});

	// POST /users/validate - Valider une session existante
	fastify.post('/users/validate', async (request, reply) => {
		const sessionId = request.cookies.player_session;

		if (!sessionId) {
			return reply.status(401).send({
				success: false,
				error: 'No session cookie found',
				code: 'SESSION_MISSING'
			});
		}

		const result = await validateSession(fastify.db, sessionId);

		if (!result.valid || !result.user) {
			return reply.status(401).send({
				success: false,
				error: 'Invalid or expired session',
				code: 'SESSION_INVALID'
			});
		}

		return reply.send({
			success: true,
			user: {
				id: result.user.id,
				username: result.user.username
			}
		});
	});

	// POST /users/logout - Supprimer la session (déconnexion)
	fastify.post('/users/logout', async (request, reply) => {
		const sessionId = request.cookies.player_session;

		if (!sessionId) {
			return reply.send({
				success: true,
				message: 'No session to logout'
			});
		}

		try {
			await deleteSession(fastify.db, sessionId);
			return reply.send({
				success: true,
				message: 'Session deleted successfully'
			});
		} catch (err: any) {
			fastify.log.error('Error deleting session:', err);
			return reply.status(500).send({
				success: false,
				error: 'Failed to delete session'
			});
		}
	});
}
