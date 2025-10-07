import type { FastifyInstance } from 'fastify';

interface Registration {
	id: number;
	tournament_id: string;
	player_id: string;
	registered_at?: string;
	is_eliminated?: boolean;
	final_position?: number;
}

export function registerTournamentRegistrationRoutes(fastify: FastifyInstance): void {
	// CREATE - Inscrire un joueur
	fastify.post<{ Body: {
		tournament_id: string;
		player_id: string;
	}}>(
		'/tournament-registrations',
		async (request, reply) => {
			const { tournament_id, player_id } = request.body;

			if (!tournament_id || !player_id)
			{
				return reply.status(400).send({
					success: false,
					error: 'tournament_id and player_id are required'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO tournament_registrations (tournament_id, player_id)
					VALUES (?, ?)`,
					[tournament_id, player_id],
					function(err)
					{
						if (err)
						{
							if (err.message.includes('UNIQUE constraint failed'))
							{
								resolve(reply.status(409).send({
									success: false,
									error: 'Player already registered'
								}));
							}
							else
							{
								resolve(reply.status(500).send({
									success: false,
									error: err.message
								}));
							}
						}
						else
						{
							resolve(reply.send({
								success: true,
								registration_id: this.lastID
							}));
						}
					}
				);
			});
		}
	);

	// READ - Joueurs d'un tournoi
	fastify.get<{ Params: { tournamentId: string } }>(
		'/tournament-registrations/tournament/:tournamentId',
		async (request, reply) => {
			const { tournamentId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT tr.*, u.username
					FROM tournament_registrations tr
					JOIN users u ON tr.player_id = u.id
					WHERE tr.tournament_id = ?
					ORDER BY tr.registered_at ASC`,
					[tournamentId],
					(err, rows: Registration[]) => {
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
								registrations: rows
							}));
						}
					}
				);
			});
		}
	);

	// UPDATE - Éliminer un joueur
	fastify.patch<{ 
		Params: { tournamentId: string; playerId: string };
		Body: { final_position?: number }
	}>(
		'/tournament-registrations/tournament/:tournamentId/player/:playerId/eliminate',
		async (request, reply) => {
			const { tournamentId, playerId } = request.params;
			const { final_position } = request.body;

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE tournament_registrations SET 
						is_eliminated = 1,
						final_position = ?
					WHERE tournament_id = ? AND player_id = ?`,
					[final_position || null, tournamentId, playerId],
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
								error: 'Registration not found'
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

	// DELETE - Désinscrire un joueur (avant le début)
	fastify.delete<{ Params: { tournamentId: string; playerId: string } }>(
		'/tournament-registrations/tournament/:tournamentId/player/:playerId',
		async (request, reply) => {
			const { tournamentId, playerId } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`DELETE FROM tournament_registrations
					WHERE tournament_id = ? AND player_id = ?
					AND tournament_id IN (
						SELECT id FROM tournaments WHERE status = 'registration'
					)`,
					[tournamentId, playerId],
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
								error: 'Cannot unregister: tournament started or not found'
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
