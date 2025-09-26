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
	interface SqliteRunResult
	{
		lastID: number;
		changes: number;
	}

	// GET /api/games => GET toutes les parties
	fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
		return new Promise<ApiResponse<Game[]>>((resolve, reject) => {
			const query = 'SELECT * FROM games ORDER BY started_at DESC'

			fastify.db.all(query, (err, rows: Game[]) => {
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
			})
		})
	})

	// GET /api/games/:id => GET une partie via id
	fastify.get('/:id', async (request: FastifyRequest<{ Params : {id: string} }>,
		reply: FastifyReply) => {
		const { id } = request.params

		return new Promise<ApiResponse<Game>>((resolve, reject) => {
			const query = 'SELECT * FROM games WHERE id = ?'

			fastify.db.get(query, [id], (err, row: Game) => {
				if (err)
				{
					fastify.log.error(err)
					reply.status(500)
					resolve({success: false, error: 'Database error'})
				}
				else if (!row)
				{
					reply.status(404)
					resolve({success: false, error: 'Game not found'})
				}
				else
				{
					resolve({success: true, data: row})
				}
			})
		})
	})

	// POST /api/games => Creer une nouvelle partie
	fastify.post('/', async (request: FastifyRequest<{ Body: CreateGameRequest }>,
		reply: FastifyReply) => {
		const { player1_name, player2_name } = request.body

		return new Promise<ApiResponse<Game>>((resolve, reject) => {
			const query = `
				INSERT INTO games (player1_name, player2_name, player1_score, player2_score, duration, status)
				VALUES (?, ?, 0, 0, 0, 'active')
			`

			fastify.db.run(query, [player1_name, player2_name], function (this: SqliteRunResult, err: Error) {
				if (err)
				{
					fastify.log.error(err)
					reply.status(500)
					resolve({success: false, error: 'Failed to create game'})
				}
				else
				{
					const selectedQuery = 'SELECT * FROM games WHERE id = ?'
					fastify.db.get(selectedQuery, [this.lastID], (err, row: Game) => {
						if (err)
						{
							reply.status(500)
							resolve({success: false, error: 'Game created but failed to retrieve'})
						}
						else
						{
							reply.status(201)
							resolve({success: true, data: row})
						}
					})
				}
			})
		})
	})

	// PUT /api/games/:id => Mettre a jour une partie
	fastify.put('/:id', async (request: FastifyRequest<{
		Params: {id: string}
		Body: UpdateGameRequest
	}>, reply: FastifyReply) => {
		const { id } = request.params
		const updates = request.body

		const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
		const values = Object.values(updates)

		if (fields.length === 0)
		{
			reply.status(400)
			return {success: false, error: 'No fields to update'}
		}

		return new Promise<ApiResponse<Game>>((resolve, reject) => {
			const query = `UPDATE games SET ${fields} WHERE id = ?`

			fastify.db.run(query, [...values, id], function(this: SqliteRunResult, err: Error) {
				if (err)
				{
					fastify.log.error(err)
					reply.status(500)
					resolve({success: false, error: 'Failed to update game'})
				}
				else if (this.changes === 0)
				{
					reply.status(404)
					resolve({success: false, error: 'Game not found'})
				}
				else
				{
					const selectQuery = `SELECT * FROM games WHERE id = ?`
					fastify.db.get(selectQuery, [id], (err, row: Game) => {
						if (err)
						{
							reply.status(500)
							resolve({success: false, error: 'Game updated but failed to retrieve'})
						}
						else 
						{
							resolve({success: true, data: row})
						}
					})
				}
			})
		})
	})
}

module.exports = gamesRoutes;
