import type { FastifyInstance } from 'fastify';

interface Tournament {
	id: string;
	name: string;
	max_players: number;
	status: 'registration' | 'in_progress' | 'finished';
	winner_id?: string;
	created_at?: string;
	started_at?: string;
	finished_at?: string;
	current_round?: number;
}

export function registerTournamentRoutes(fastify: FastifyInstance): void
{
	// CREATE - Créer un tournoi
	fastify.post<{ Body: {
		id: string;
		name: string;
		max_players: number;
	}}>(
		'/tournaments',
		async (request, reply) => {
			const { id, name, max_players } = request.body;

			if (!id || !name || !max_players)
			{
				return reply.status(400).send({
					success: false,
					error: 'id, name, and max_players are required'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO tournaments (id, name, max_players, status)
					VALUES (?, ?, ?, 'registration')`,
					[id, name, max_players],
					function(err) {
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
								tournament: { id, name, max_players, status: 'registration' }
							}));
						}
					}
				);
			});
		}
	);

	// READ - Récupérer un tournoi
	fastify.get<{ Params: { id: string } }>(
		'/tournaments/:id',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT * FROM tournaments WHERE id = ?`,
					[id],
					(err, row: Tournament) => {
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
								error: 'Tournament not found'
							}));
						}
						else
						{
							resolve(reply.send({
								success: true,
								tournament: row
							}));
						}
					}
				);
			});
		}
	);

	// READ - Liste des tournois actifs
	fastify.get('/tournaments', async (request, reply) => {
		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT * FROM tournaments 
				WHERE status IN ('registration', 'in_progress')
				ORDER BY created_at DESC`,
				[],
				(err, rows: Tournament[]) => {
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
							tournaments: rows
						}));
					}
				}
			);
		});
	});

	// UPDATE - Démarrer un tournoi
	fastify.patch<{ Params: { id: string } }>(
		'/tournaments/:id/start',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE tournaments SET 
						status = 'in_progress',
						started_at = CURRENT_TIMESTAMP,
						current_round = 1
					WHERE id = ? AND status = 'registration'`,
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
							resolve(reply.status(400).send({
								success: false,
								error: 'Tournament not found or already started'
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

	// UPDATE - Terminer un tournoi
	fastify.patch<{ 
		Params: { id: string };
		Body: { winner_id: string }
	}>(
		'/tournaments/:id/finish',
		async (request, reply) => {
			const { id } = request.params;
			const { winner_id } = request.body;

			if (!winner_id)
			{
				return reply.status(400).send({
					success: false,
					error: 'winner_id is required'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE tournaments SET 
						status = 'finished',
						finished_at = CURRENT_TIMESTAMP,
						winner_id = ?
					WHERE id = ? AND status = 'in_progress'`,
					[winner_id, id],
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
							resolve(reply.status(400).send({
								success: false,
								error: 'Tournament not found or not in progress'
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

	// UPDATE - Avancer au round suivant
	fastify.patch<{ Params: { id: string } }>(
		'/tournaments/:id/next-round',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE tournaments SET 
						current_round = current_round + 1
					WHERE id = ? AND status = 'in_progress'`,
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
							resolve(reply.status(400).send({
								success: false,
								error: 'Tournament not found or not in progress'
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

	// DELETE - Supprimer un tournoi (pour les tests uniquement)
	fastify.delete<{ Params: { id: string } }>(
		'/tournaments/:id',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`DELETE FROM tournaments WHERE id = ?`,
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
								error: 'Tournament not found'
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
