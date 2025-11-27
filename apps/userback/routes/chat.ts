import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RawData, WebSocket } from 'ws';

type IncomingChatMessage = {
	username?: string;
	content?: string;
};

type OutgoingChatMessage = {
	username: string;
	content: string;
	created_at: string;
};

export function registerChatRoutes(fastify: FastifyInstance): void {
	const clients = new Set<WebSocket>();

	const broadcast = (message: OutgoingChatMessage) => {
		const serialized = JSON.stringify(message);
		for (const client of clients) {
			if (client.readyState === client.OPEN) {
				client.send(serialized);
			}
		}
	};

	fastify.get('/chat/messages', async (_request, reply) => {
		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT username, content, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 50`,
				[],
				(err, rows) => {
					if (err) {
						resolve(reply.status(500).send({
							success: false,
							error: err.message
						}));
						return;
					}

					// Renvoie dans l'ordre chronologique
					const messages = (rows || []).reverse();
					resolve(reply.send({ success: true, messages }));
				}
			);
		});
	});

	// Fallback HTTP POST to inject a message (utile pour debug)
	fastify.post<{ Body: { username?: string; content?: string } }>('/chat/messages', async (request, reply) => {
		const username = (request.body?.username || '').trim();
		const content = (request.body?.content || '').trim();

		if (!username || !content) {
			return reply.status(400).send({ success: false, error: 'username and content required' });
		}

		if (username.length > 32 || content.length > 500) {
			return reply.status(400).send({ success: false, error: 'invalid lengths' });
		}

		const created_at = new Date().toISOString();
		const outgoing: OutgoingChatMessage = { username, content, created_at };

		return new Promise((resolve) => {
			fastify.db.run(
				`INSERT INTO chat_messages (username, content, created_at) VALUES (?, ?, ?)`,
				[username, content, created_at],
				(err) => {
					if (err) {
						fastify.log.error({ err }, 'failed to insert chat message (http)');
						resolve(reply.status(500).send({ success: false, error: err.message }));
						return;
					}

					broadcast(outgoing);
					resolve(reply.send({ success: true, message: outgoing }));
				}
			);
		});
	});

	fastify.get('/chat', { websocket: true }, (connection, req: FastifyRequest) => {
		if (!connection || !connection.socket) {
			fastify.log.error('ws connection missing socket');
			return;
		}

		const socket = connection.socket;
		clients.add(socket);
		fastify.log.info({ client: req.ip }, 'chat ws connected');

		socket.on('message', (raw: RawData) => {
			let payload: IncomingChatMessage | null = null;
			try {
				payload = JSON.parse(raw.toString());
			} catch (err) {
				fastify.log.warn({ err }, 'chat ws invalid json');
				return;
			}

			const username = (payload?.username || '').trim();
			const content = (payload?.content || '').trim();

			if (!username || !content) {
				fastify.log.warn('chat ws missing username/content');
				return;
			}

			if (username.length > 32 || content.length > 500) {
				fastify.log.warn('chat ws invalid lengths');
				return;
			}

			const created_at = new Date().toISOString();
			const outgoing: OutgoingChatMessage = { username, content, created_at };

			fastify.db.run(
				`INSERT INTO chat_messages (username, content, created_at) VALUES (?, ?, ?)`,
				[username, content, created_at],
				(err) => {
					if (err) {
						fastify.log.error({ err }, 'failed to insert chat message');
					}
				}
			);

			broadcast(outgoing);
		});

		socket.on('close', () => {
			clients.delete(socket);
			fastify.log.info({ client: req.ip }, 'chat ws disconnected');
		});

		socket.on('error', (err) => {
			fastify.log.error({ err }, 'chat ws error');
		});
	});
}
