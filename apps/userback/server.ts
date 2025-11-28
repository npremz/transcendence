import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sqlite3 from 'sqlite3';
import { initDatabase, closeDatabase } from './database';
import { registerUserRoutes } from './routes/users';
import { registerChatRoutes } from './routes/chat';
import { registerAuthRoutes } from './routes/auth';
import { authenticateJWT } from './middleware/auth';
import { cleanupExpiredTokens } from './utils/jwt';

declare module 'fastify' {
	interface FastifyInstance {
		db: sqlite3.Database;
		authenticate: typeof authenticateJWT;
	}
}

async function start() {
	const fastify = Fastify({
		logger: true
	});

	// Configuration CORS
	await fastify.register(cors, {
		origin: process.env.CORS_ORIGIN || '*',
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
	});

	// Configuration Rate Limiting
	await fastify.register(rateLimit, {
		global: true,
		max: 100,
		timeWindow: '1 minute',
		cache: 10000,
		allowList: ['127.0.0.1'],
		redis: undefined,
		skipOnError: true
	});

	// Configuration JWT
	const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
	if (jwtSecret === 'your-secret-key-change-this-in-production') {
		fastify.log.warn('⚠️  WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!');
	}

	await fastify.register(jwt, {
		secret: jwtSecret,
		sign: {
			algorithm: 'HS256'
		}
	});

	// Décorateur pour le middleware d'authentification
	fastify.decorate('authenticate', authenticateJWT);

	await fastify.register(websocket);

	const db = await initDatabase();
	fastify.decorate('db', db);

	// Nettoyage périodique des tokens expirés (toutes les heures)
	setInterval(async () => {
		try {
			const deleted = await cleanupExpiredTokens(db);
			if (deleted > 0) {
				fastify.log.info(`Cleaned up ${deleted} expired token(s)`);
			}
		} catch (err) {
			fastify.log.error('Error cleaning up expired tokens:', err);
		}
	}, 60 * 60 * 1000); // 1 heure

	registerAuthRoutes(fastify);
	registerUserRoutes(fastify);
	registerChatRoutes(fastify);

	fastify.get('/', (request, reply) => {
		reply.send({ status: 'ok' });
	});

	fastify.get('/health', async () => {
		return { status: 'ok', service: 'user-backend', db: 'connected' };
	});

	fastify.addHook('onClose', async (_instance) => {
		await closeDatabase(db);
	});

	const port = Number(process.env.PORT || 3060);

	try {
		await fastify.listen({ port, host: '0.0.0.0' });
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

start().catch((err) => {
	console.error('Failed to start userback server', err);
	process.exit(1);
});
