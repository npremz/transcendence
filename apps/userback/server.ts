import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import sqlite3 from 'sqlite3';
import { initDatabase, closeDatabase } from './database';
import { registerUserRoutes } from './routes/users';
import { registerChatRoutes } from './routes/chat';
import { registerGithubAuthRoutes } from './routes/github';
import { cleanExpiredSessions } from './sessionManager';

declare module 'fastify' {
	interface FastifyInstance {
		db: sqlite3.Database;
	}
}

async function start() {
	console.log('[DEBUG] Starting server...');
	const fastify = Fastify({
		logger: true
	});

	console.log('[DEBUG] Fastify created, registering CORS...');
	// Configuration CORS pour accepter les credentials (cookies)
	await fastify.register(cors, {
		origin: true, // Accepter toutes les origins pour le moment
		credentials: true, // Autoriser l'envoi de cookies
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization']
	});

	console.log('[DEBUG] CORS registered, registering websocket...');
	await fastify.register(websocket);
	console.log('[DEBUG] Websocket registered, registering cookie...');
	await fastify.register(cookie, {
		secret: process.env.COOKIE_SECRET || 'transcendence-cookie-secret-change-me-in-production',
		parseOptions: {}
	});

	console.log('[DEBUG] Cookie registered, initializing database...');
	const db = await initDatabase();
	console.log('[DEBUG] Database initialized, decorating fastify...');
	fastify.decorate('db', db);

	// Nettoyage périodique des sessions expirées (toutes les heures)
	setInterval(() => {
		cleanExpiredSessions(db)
			.then(count => {
				if (count > 0) {
					fastify.log.info(`Cleaned ${count} expired sessions`);
				}
			})
			.catch(err => fastify.log.error('Error cleaning expired sessions:', err));
	}, 60 * 60 * 1000);

	registerUserRoutes(fastify);
	registerChatRoutes(fastify);
	registerGithubAuthRoutes(fastify);

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
