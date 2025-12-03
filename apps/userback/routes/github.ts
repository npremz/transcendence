import { randomUUID } from 'crypto';
import https from 'https';
import type { FastifyInstance } from 'fastify';
import { createSession } from '../sessionManager';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

// Helper: requête HTTPS simple sans dépendance externe
function httpsRequest(
	url: string,
	options: { method: string; headers: Record<string, string>; body?: string }
): Promise<{ status: number; data: any }> {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const req = https.request({
			hostname: urlObj.hostname,
			path: urlObj.pathname + urlObj.search,
			method: options.method,
			headers: options.headers,
		}, (res) => {
			let body = '';
			res.on('data', chunk => body += chunk);
			res.on('end', () => {
				try {
					resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
				} catch {
					resolve({ status: res.statusCode || 500, data: body });
				}
			});
		});
		req.on('error', reject);
		if (options.body) req.write(options.body);
		req.end();
	});
}

export function registerGithubAuthRoutes(fastify: FastifyInstance): void {
	const clientId = process.env.AUTH_CLIENT_ID;
	const clientSecret = process.env.AUTH_CLIENT_SECRET;
	const host = process.env.VITE_HOST || 'localhost:8443';
	const callbackUrl = `https://${host}/userback/auth/github/callback`;

	if (!clientId || !clientSecret) {
		fastify.log.warn('GitHub OAuth disabled: AUTH_CLIENT_ID or AUTH_CLIENT_SECRET missing');
		return;
	}

	// 1. Initie le flow OAuth → redirect vers GitHub
	fastify.get('/auth/github', async (_request, reply) => {
		const state = randomUUID(); // Anti-CSRF

		// Stocker state en cookie temporaire (5 min)
		// Path doit être accessible au callback (via proxy /userback)
		reply.setCookie('github_oauth_state', state, {
			path: '/userback',
			maxAge: 300,
			httpOnly: true,
			secure: true,
			sameSite: 'lax'
		});

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: callbackUrl,
			scope: 'read:user',
			state
		});

		return reply.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`);
	});

	// 2. Callback GitHub → échange code, crée session
	fastify.get('/auth/github/callback', async (request, reply) => {
		const { code, state } = request.query as { code?: string; state?: string };
		const storedState = request.cookies.github_oauth_state;

		// Nettoyer le cookie state
		reply.clearCookie('github_oauth_state', { path: '/userback' });

		// Validations
		if (!code || !state || state !== storedState) {
			return reply.redirect('/?error=oauth_invalid_state');
		}

		try {
			// Échange code → access_token
			const tokenRes = await httpsRequest(GITHUB_TOKEN_URL, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: clientId,
					client_secret: clientSecret,
					code,
					redirect_uri: callbackUrl
				}).toString()
			});

			if (!tokenRes.data.access_token) {
				fastify.log.error('GitHub token exchange failed', tokenRes.data);
				return reply.redirect('/?error=oauth_token_failed');
			}

			const accessToken = tokenRes.data.access_token;

			// Récupère infos utilisateur GitHub
			const userRes = await httpsRequest(GITHUB_USER_URL, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
					'User-Agent': 'Transcendence-App'
				}
			});

			if (userRes.status !== 200 || !userRes.data.id) {
				return reply.redirect('/?error=oauth_user_failed');
			}

			const githubUser = userRes.data;
			const githubId = String(githubUser.id);
			const username = githubUser.login;

			// Cherche ou crée l'utilisateur
			const user = await findOrCreateGithubUser(fastify.db, githubId, username);

			// Crée la session
			const sessionId = randomUUID();
			await createSession(fastify.db, sessionId, user.id, 30);

			// Set cookie de session
			reply.setCookie('player_session', sessionId, {
				path: '/',
				maxAge: 30 * 24 * 60 * 60,
				httpOnly: false,
				secure: true,
				sameSite: 'strict'
			});

			// Redirect vers frontend avec succès
			return reply.redirect(`/?oauth=success&username=${encodeURIComponent(user.username)}`);

		} catch (error) {
			fastify.log.error('GitHub OAuth error:', error);
			return reply.redirect('/?error=oauth_error');
		}
	});
}

// Helper: trouve ou crée un user lié à GitHub
function findOrCreateGithubUser(
	db: any,
	githubId: string,
	username: string
): Promise<{ id: string; username: string }> {
	return new Promise((resolve, reject) => {
		// D'abord chercher par github_id
		db.get(
			`SELECT id, username FROM users WHERE github_id = ?`,
			[githubId],
			(err: any, row: any) => {
				if (err) return reject(err);

				if (row) {
					return resolve({ id: row.id, username: row.username });
				}

				// Pas trouvé → créer un nouveau user
				const newId = randomUUID();
				// Générer un username unique si collision
				const baseUsername = username.substring(0, 17); // max 20 chars

				db.run(
					`INSERT INTO users (id, username, github_id) VALUES (?, ?, ?)`,
					[newId, baseUsername, githubId],
					function(this: any, err: any) {
						if (err?.message?.includes('UNIQUE constraint failed: users.username')) {
							// Username existe → ajouter suffix
							const uniqueUsername = `${baseUsername}_${githubId.slice(-3)}`;
							db.run(
								`INSERT INTO users (id, username, github_id) VALUES (?, ?, ?)`,
								[newId, uniqueUsername, githubId],
								function(this: any, err2: any) {
									if (err2) return reject(err2);
									resolve({ id: newId, username: uniqueUsername });
								}
							);
						} else if (err) {
							return reject(err);
						} else {
							resolve({ id: newId, username: baseUsername });
						}
					}
				);
			}
		);
	});
}
