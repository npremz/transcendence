import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RawData, WebSocket } from 'ws';

type IncomingChatMessage = {
	username?: string;
	content?: string;
};

type OutgoingChatMessage = {
	username: string;
	content: string;
	avatar?: string;
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

	const getUserAvatar = (username: string): Promise<string | undefined> => {
        return new Promise((resolve) => {
            fastify.db.get(
                `SELECT avatar FROM users WHERE username = ?`, 
                [username], 
                (err, row: any) => {
                    resolve(row?.avatar || undefined);
                }
            );
        });
    };

// GET - Historique avec Avatars (JOIN)
	fastify.get('/chat/messages', async (_request, reply) => {
		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT 
                    cm.username, 
                    cm.content, 
                    cm.created_at,
                    u.avatar
                FROM chat_messages cm
                LEFT JOIN users u ON cm.username = u.username
                ORDER BY cm.created_at DESC 
                LIMIT 50`,
				[],
				(err, rows) => {
					if (err) {
						resolve(reply.status(500).send({ success: false, error: err.message }));
						return;
					}
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
		const avatar = await getUserAvatar(username);
		const outgoing: OutgoingChatMessage = { username, content, created_at, avatar };

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

	// WebSocket (Lecture seule pour les clients, ou envoi legacy)
	fastify.get('/chat', { websocket: true }, (connection, req: FastifyRequest) => {
		const socket = connection.socket;
		clients.add(socket);

		socket.on('message', async (raw: RawData) => {
            // Fallback pour les clients qui envoient encore via WS
			try {
                const payload = JSON.parse(raw.toString()) as IncomingChatMessage;
                const username = (payload.username || '').trim();
                const content = (payload.content || '').trim();
                
                if (username && content) {
                    const created_at = new Date().toISOString();
                    const avatar = await getUserAvatar(username);
                    
                    // Sauvegarde DB
                    fastify.db.run(
                        `INSERT INTO chat_messages (username, content, created_at) VALUES (?, ?, ?)`,
                        [username, content, created_at]
                    );
                    
                    // Diffusion
                    broadcast({ username, content, created_at, avatar });
                }
            } catch (e) {}
		});

		socket.on('close', () => clients.delete(socket));
	});
}
