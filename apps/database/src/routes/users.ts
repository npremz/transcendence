import type { FastifyInstance } from 'fastify';
import type { Database } from 'sqlite3';

interface User {
	id: string;
	username: string;
	created_at?: string;
	last_seen?: string;
	total_games?: number;
	total_wins?: number;
	total_losses?: number;
}

export function registerUserRoutes(fastify: FastifyInstance): void
{
	// CREATE - Créer un nouvel utilisateur
	fastify.post<{ Body: { id: string; username: string } }>(
		'/users',
		async (request, reply) => {
			const { id, username } = request.body;

			if (!id || !username)
			{
				return reply.status(400).send({
					success: false,
					error: 'id and username are required'
				});
			}

			return new Promise((resolve, reject) => {
				fastify.db.run(
					`INSERT INTO users (id, username) VALUES (?, ?)`,
					[id, username],
					function(err)
					{
						if (err)
						{
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else
						{
							resolve(reply.send({
								success: true,
								user: { id, username }
							}));
						}
					}
				);
			});
		}
	);

	// READ - Récupérer un utilisateur par ID
	fastify.get<{ Params: { id: string } }>(
		'/users/:id',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve, reject) => {
				fastify.db.get(
					`SELECT * FROM users WHERE id = ?`,
					[id],
					(err, row: User) => {
						if (err)
						{
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else if (!row)
						{
							resolve(reply.status(404).send({
								success: false,
								error: 'User not found'
							}));
						}
						else
						{
							resolve(reply.send({
								success: true,
								user: row
							}));
						}
					}
				);
			});
		}
	);

	// READ - Récupérer un utilisateur par username
	fastify.get<{ Querystring: { username: string } }>(
		'/users',
		async (request, reply) => {
			const { username } = request.query;

			if (!username)
			{
				return new Promise((resolve) => {
					fastify.db.all(
						`SELECT * FROM users ORDER BY created_at DESC LIMIT 100`,
						[],
						(err, rows: User[]) => {
							if (err)
							{
								resolve(reply.status(500).send({
									success: false,
									error: err.message
								}));
							}
							else
							{
								resolve(reply.send({
									success: true,
									users: rows
								}));
							}
						}
					);
				});
			}

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT * FROM users WHERE username = ?`,
					[username],
					(err, row: User) => {
						if (err)
						{
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else if (!row)
						{
							resolve(reply.status(404).send({
								success: false,
								error: 'User not found'
							}));
						}
						else
						{
							resolve(reply.send({
								success: true,
								user: row
							}));
						}
					}
				);
			});
		}
	);

	// UPDATE - Mettre à jour last_seen
	fastify.patch<{ Params: { id: string } }>(
		'/users/:id/last-seen',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
					[id],
					function(err)
					{
						if (err)
						{
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else if (this.changes === 0)
						{
							resolve(reply.status(404).send({
								success: false,
								error: 'User not found'
							}));
						}
						else
						{
							resolve(reply.send({ success: true }));
						}
					}
				);
			});
		}
	);

	// UPDATE - Incrémenter les statistiques
	fastify.patch<{ 
		Params: { id: string };
		Body: { won: boolean }
	}>(
		'/users/:id/stats',
		async (request, reply) => {
			const { id } = request.params;
			const { won } = request.body;

			const winField = won ? 'total_wins = total_wins + 1,' : '';
			const lossField = !won ? 'total_losses = total_losses + 1,' : '';

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE users SET 
						total_games = total_games + 1,
						${winField}
						${lossField}
						last_seen = CURRENT_TIMESTAMP
					WHERE id = ?`,
					[id],
					function(err)
					{
						if (err)
						{
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else if (this.changes === 0)
						{
							resolve(reply.status(404).send({
								success: false,
								error: 'User not found'
							}));
						}
						else
						{
							resolve(reply.send({ success: true }));
						}
					}
				);
			});
		}
	);

	// READ - Leaderboard
	fastify.get('/users/leaderboard', async (request, reply) => {
		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT 
					id, username, total_games, total_wins, total_losses,
					ROUND(CAST(total_wins AS FLOAT) / NULLIF(total_games, 0) * 100, 2) as win_rate
				FROM users
				WHERE total_games > 0
				ORDER BY total_wins DESC, win_rate DESC
				LIMIT 50`,
				[],
				(err, rows: User[]) => {
					if (err)
					{
						resolve(reply.status(500).send({
							success: false,
							error: err.message
						}));
					}
					else
					{
						resolve(reply.send({
							success: true,
							leaderboard: rows
						}));
					}
				}
			);
		});
	});

	// DELETE - Supprimer un utilisateur (pour les tests uniquement)
	fastify.delete<{ Params: { id: string } }>(
		'/users/:id',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`DELETE FROM users WHERE id = ?`,
					[id],
					function(err)
					{
						if (err)
						{
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else if (this.changes === 0)
						{
							resolve(reply.status(404).send({
								success: false,
								error: 'User not found'
							}));
						}
						else
						{
							resolve(reply.send({ success: true }));
						}
					}
				);
			});
		}
	);

}
