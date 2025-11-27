import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import sqlite3 from 'sqlite3';
import { initDatabase, closeDatabase } from './database';
import { registerUserRoutes } from './routes/users';
import { registerChatRoutes } from './routes/chat';

declare module 'fastify' {
	interface FastifyInstance {
		db: sqlite3.Database;
	}
}

async function start() {
	const fastify = Fastify({
		logger: true
	});

	await fastify.register(websocket);

	const db = await initDatabase();
	fastify.decorate('db', db);

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
