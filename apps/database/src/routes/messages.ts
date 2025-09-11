import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  GlobalMessage, 
  GameMessage, 
  CreateMessageRequest,
  CreateGameMessageRequest,
  ApiResponse 
} from '../types';

async function messagesRoutes(fastify: FastifyInstance) {

  // GET /api/messages/global => Recuperer les messages global
	fastify.get('/global', async (request: FastifyRequest<{ 
		Querystring: { limit?: string } 
	}>, reply: FastifyReply) => {
		const limit = parseInt(request.query.limit || '50');
		
		return new Promise<ApiResponse<GlobalMessage[]>>((resolve, reject) => {
		const query = 'SELECT * FROM global_messages ORDER BY timestamp DESC LIMIT ?';
		
		fastify.db.all(query, [limit], (err, rows: GlobalMessage[]) => {
			if (err)
			{
				fastify.log.error(err);
				reply.status(500);
				resolve({ success: false, error: 'Database error' });
			}
			else
			{
				resolve({ success: true, data: rows.reverse() });
			}
		});
		});
	});

	// POST /api/messages/global => Poster un message global
	fastify.post('/global', async (request: FastifyRequest<{ 
		Body: CreateMessageRequest 
	}>, reply: FastifyReply) => {
		const { username, content } = request.body;
		
		return new Promise<ApiResponse<GlobalMessage>>((resolve, reject) => {
		const query = 'INSERT INTO global_messages (username, content) VALUES (?, ?)';
		
		fastify.db.run(query, [username, content], function(err) {
			if (err)
			{
				fastify.log.error(err);
				reply.status(500);
				resolve({ success: false, error: 'Failed to create message' });
			}
			else
			{
				const selectQuery = 'SELECT * FROM global_messages WHERE id = ?';
				fastify.db.get(selectQuery, [this.lastID], (err, row: GlobalMessage) => {
					if (err)
					{
						reply.status(500);
						resolve({ success: false, error: 'Message created but failed to retrieve' });
					}
					else
					{
						reply.status(201);
						resolve({ success: true, data: row });
					}
				});
			}
		});
		});
	});

	// GET /api/messages/game/:gameId => Recup les messages d'une partie
	fastify.get('/game/:gameId', async (request: FastifyRequest<{ 
		Params: { gameId: string } 
	}>, reply: FastifyReply) => {
		const { gameId } = request.params;
		
		return new Promise<ApiResponse<GameMessage[]>>((resolve, reject) => {
			const gameQuery = 'SELECT finished_at FROM games WHERE id = ? AND status = "finished"';
			
			fastify.db.get(gameQuery, [gameId], (err, game: { finished_at?: string }) => {
				if (err)
				{
					fastify.log.error(err);
					reply.status(500);
					resolve({ success: false, error: 'Database error' });
					return;
				}
				
				if (game?.finished_at)
				{
					const finishedTime = new Date(game.finished_at).getTime();
					const now = Date.now();
					const tenMinutes = 10 * 60 * 1000;
					
					if (now - finishedTime > tenMinutes)
					{
						resolve({ success: true, data: [] });
						return;
					}
				}
				
				const messagesQuery = 'SELECT * FROM game_messages WHERE game_id = ? ORDER BY timestamp ASC';
				fastify.db.all(messagesQuery, [gameId], (err, rows: GameMessage[]) => {
					if (err)
					{
						fastify.log.error(err);
						reply.status(500);
						resolve({ success: false, error: 'Database error' });
					}
					else
					{
						resolve({ success: true, data: rows });
					}
				});
			});
		});
	});

	// POST /api/messages/game/:gameId - Poster un message dans une partie
	fastify.post('/game/:gameId', async (request: FastifyRequest<{ 
		Params: { gameId: string },
		Body: CreateMessageRequest 
	}>, reply: FastifyReply) => {
		const { gameId } = request.params;
		const { username, content } = request.body;
		
		return new Promise<ApiResponse<GameMessage>>((resolve, reject) => {
			const query = 'INSERT INTO game_messages (game_id, username, content) VALUES (?, ?, ?)';
			
			fastify.db.run(query, [gameId, username, content], function(err) {
				if (err)
				{
					fastify.log.error(err);
					reply.status(500);
					resolve({ success: false, error: 'Failed to create message' });
				}
				else
				{
					const selectQuery = 'SELECT * FROM game_messages WHERE id = ?';
					fastify.db.get(selectQuery, [this.lastID], (err, row: GameMessage) => {
						if (err)
						{
							reply.status(500);
							resolve({ success: false, error: 'Message created but failed to retrieve' });
						}
						else
						{
							reply.status(201);
							resolve({ success: true, data: row });
						}
					});
				}
			});
		});
	});
}

module.exports = messagesRoutes;
