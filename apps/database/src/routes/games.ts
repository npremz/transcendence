import {
	FastifyInstance,
	FastifyRequest,
	FastifyReply
} from 'fastify'
import {
	Game,
	CreateGameRequest,
	UpdateGameRequest,
	ApiResponse
} from '../types'

async function gamesRoutes(fastify: FastifyInstance)
{
	fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
		return new Promise<ApiResponse<Game[]>>((resolve, reject) => {
			const query = 'SELECT * FROM games ORDER BY started_at DESC'

			fastify.db.all(query, (err, rows: Game[]) => {
				if (err) {
				fastify.log.error(err);
				reply.status(500);
				resolve({ success: false, error: 'Database error' });
				} else {
				resolve({ success: true, data: rows });
				}
			})
		})
	})
}
