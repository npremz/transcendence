import { randomBytes, randomUUID, pbkdf2Sync } from 'crypto';
import type { FastifyInstance } from 'fastify';

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

	// GET - Récupérer un utilisateur par username (ou liste récente)
	fastify.get<{ Querystring: { username?: string } }>('/users', async (request, reply) => {
		const { username } = request.query || {};

		if (username) {
			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT id, username, created_at, last_seen FROM users WHERE username = ?`,
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
}
