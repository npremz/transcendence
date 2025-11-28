import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { verifyPassword } from '../utils/password';
import {
	generateJti,
	hashToken,
	storeRefreshToken,
	verifyRefreshToken,
	updateRefreshTokenUsage,
	revokeRefreshToken,
	revokeAllUserTokens,
	blacklistToken
} from '../utils/jwt';
import { extractRequestInfo } from '../middleware/auth';

type LoginBody = {
	username?: string;
	password?: string;
};

type RefreshBody = {
	refreshToken?: string;
};

const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms

/**
 * Génère un access token et un refresh token
 */
async function generateTokens(
	fastify: FastifyInstance,
	userId: string,
	username: string,
	userAgent?: string,
	ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> {
	// Génère l'access token
	const accessJti = generateJti();
	const accessToken = fastify.jwt.sign(
		{
			userId,
			username,
			jti: accessJti
		},
		{
			expiresIn: ACCESS_TOKEN_EXPIRY
		}
	);

	// Génère le refresh token
	const refreshTokenId = randomUUID();
	const refreshTokenValue = randomUUID();
	const refreshTokenHash = hashToken(refreshTokenValue);
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

	// Stocke le refresh token
	await storeRefreshToken(fastify.db, {
		id: refreshTokenId,
		userId,
		tokenHash: refreshTokenHash,
		expiresAt,
		userAgent,
		ipAddress
	});

	return {
		accessToken,
		refreshToken: refreshTokenValue
	};
}

export function registerAuthRoutes(fastify: FastifyInstance): void {
	/**
	 * POST /auth/login
	 * Authentifie un utilisateur et retourne les tokens JWT
	 */
	fastify.post<{ Body: LoginBody }>(
		'/auth/login',
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: '1 minute'
				}
			}
		},
		async (request, reply) => {
			const { username, password } = request.body || {};

			if (!username || !password) {
				return reply.status(400).send({
					success: false,
					error: 'username and password are required'
				});
			}

			// Récupère l'utilisateur
			const user = await new Promise<any>((resolve, reject) => {
				fastify.db.get(
					`SELECT id, username, password_hash FROM users WHERE username = ?`,
					[username],
					(err, row) => {
						if (err) reject(err);
						else resolve(row);
					}
				);
			});

			if (!user) {
				return reply.status(401).send({
					success: false,
					error: 'Invalid username or password'
				});
			}

			// Vérifie le mot de passe
			const isValid = verifyPassword(password, user.password_hash);
			if (!isValid) {
				return reply.status(401).send({
					success: false,
					error: 'Invalid username or password'
				});
			}

			// Génère les tokens
			const { userAgent, ipAddress } = extractRequestInfo(request);
			const { accessToken, refreshToken } = await generateTokens(
				fastify,
				user.id,
				user.username,
				userAgent,
				ipAddress
			);

			// Met à jour last_seen
			fastify.db.run(
				`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
				[user.id]
			);

			return reply.send({
				success: true,
				accessToken,
				refreshToken,
				expiresIn: ACCESS_TOKEN_EXPIRY,
				user: {
					id: user.id,
					username: user.username
				}
			});
		}
	);

	/**
	 * POST /auth/refresh
	 * Rafraîchit l'access token avec un refresh token valide
	 */
	fastify.post<{ Body: RefreshBody }>(
		'/auth/refresh',
		{
			config: {
				rateLimit: {
					max: 10,
					timeWindow: '1 minute'
				}
			}
		},
		async (request, reply) => {
			const { refreshToken } = request.body || {};

			if (!refreshToken) {
				return reply.status(400).send({
					success: false,
					error: 'refreshToken is required'
				});
			}

			// Vérifie le refresh token
			const tokenHash = hashToken(refreshToken);
			const tokenData = await verifyRefreshToken(fastify.db, tokenHash);

			if (!tokenData) {
				return reply.status(401).send({
					success: false,
					error: 'Invalid or expired refresh token'
				});
			}

			// Récupère l'utilisateur
			const user = await new Promise<any>((resolve, reject) => {
				fastify.db.get(
					`SELECT id, username FROM users WHERE id = ?`,
					[tokenData.userId],
					(err, row) => {
						if (err) reject(err);
						else resolve(row);
					}
				);
			});

			if (!user) {
				return reply.status(401).send({
					success: false,
					error: 'User not found'
				});
			}

			// Met à jour l'utilisation du refresh token
			await updateRefreshTokenUsage(fastify.db, tokenData.id);

			// Génère un nouvel access token
			const accessJti = generateJti();
			const accessToken = fastify.jwt.sign(
				{
					userId: user.id,
					username: user.username,
					jti: accessJti
				},
				{
					expiresIn: ACCESS_TOKEN_EXPIRY
				}
			);

			return reply.send({
				success: true,
				accessToken,
				expiresIn: ACCESS_TOKEN_EXPIRY
			});
		}
	);

	/**
	 * POST /auth/logout
	 * Révoque le refresh token et blacklist l'access token
	 */
	fastify.post<{ Body: RefreshBody }>(
		'/auth/logout',
		{
			onRequest: [fastify.authenticate]
		},
		async (request, reply) => {
			const { refreshToken } = request.body || {};
			const user = request.user!;

			// Révoque le refresh token si fourni
			if (refreshToken) {
				const tokenHash = hashToken(refreshToken);
				await revokeRefreshToken(fastify.db, tokenHash);
			}

			// Blacklist l'access token actuel
			const decoded = fastify.jwt.decode(request.headers.authorization?.split(' ')[1] || '') as any;
			if (decoded && decoded.exp) {
				await blacklistToken(
					fastify.db,
					user.jti,
					user.userId,
					'access',
					new Date(decoded.exp * 1000),
					'logout'
				);
			}

			return reply.send({
				success: true,
				message: 'Logged out successfully'
			});
		}
	);

	/**
	 * POST /auth/logout-all
	 * Révoque tous les refresh tokens de l'utilisateur
	 */
	fastify.post(
		'/auth/logout-all',
		{
			onRequest: [fastify.authenticate]
		},
		async (request, reply) => {
			const user = request.user!;

			// Révoque tous les refresh tokens
			const revokedCount = await revokeAllUserTokens(fastify.db, user.userId);

			// Blacklist l'access token actuel
			const decoded = fastify.jwt.decode(request.headers.authorization?.split(' ')[1] || '') as any;
			if (decoded && decoded.exp) {
				await blacklistToken(
					fastify.db,
					user.jti,
					user.userId,
					'access',
					new Date(decoded.exp * 1000),
					'logout-all'
				);
			}

			return reply.send({
				success: true,
				message: `Logged out from ${revokedCount} device(s)`
			});
		}
	);

	/**
	 * GET /auth/me
	 * Retourne les informations de l'utilisateur connecté
	 */
	fastify.get(
		'/auth/me',
		{
			onRequest: [fastify.authenticate]
		},
		async (request, reply) => {
			const user = request.user!;

			// Récupère les informations complètes de l'utilisateur
			const userData = await new Promise<any>((resolve, reject) => {
				fastify.db.get(
					`SELECT id, username, avatar_url, created_at, last_seen, 
					        total_games, total_wins, total_losses 
					 FROM users WHERE id = ?`,
					[user.userId],
					(err, row) => {
						if (err) reject(err);
						else resolve(row);
					}
				);
			});

			if (!userData) {
				return reply.status(404).send({
					success: false,
					error: 'User not found'
				});
			}

			return reply.send({
				success: true,
				user: userData
			});
		}
	);
}
