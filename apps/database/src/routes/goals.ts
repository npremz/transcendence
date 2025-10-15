import type { FastifyInstance } from 'fastify';

interface Goal {
	id: number;
	game_id: string;
	scorer_side: 'left' | 'right';
	scored_against_side: 'left' | 'right';
	ball_y_position: number;
	scored_at_game_time: number;
	scored_at: string;
}

export function registerGoalRoutes(fastify: FastifyInstance): void
{
	// CREATE - Enregistrer un goal
	fastify.post<{ Body: {
		game_id: string;
		scorer_side: 'left' | 'right';
		scored_against_side: 'left' | 'right';
		ball_y_position: number;
		scored_at_game_time: number;
	}}>(
		'/goals',
		async (request, reply) => {
			const {
				game_id,
				scorer_side,
				scored_against_side,
				ball_y_position,
				scored_at_game_time
			} = request.body;

			if (!game_id || !scorer_side || !scored_against_side || ball_y_position === undefined || scored_at_game_time === undefined)
			{
				return reply.status(400).send({
					success: false,
					error: 'Missing required fields'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO goals_scored (
						game_id, scorer_side, scored_against_side, ball_y_position, scored_at_game_time
					) VALUES (?, ?, ?, ?, ?)`,
					[game_id, scorer_side, scored_against_side, ball_y_position, scored_at_game_time],
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
								id: this.lastID
							}));
						}
					}
				);
			});
		}
	);

	// READ - Récupérer tous les goals d'une partie
	fastify.get<{ Params: { gameId: string } }>(
		'/goals/game/:gameId',
		async (request, reply) => {
			const { gameId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT * FROM goals_scored WHERE game_id = ? ORDER BY scored_at_game_time`,
					[gameId],
					(err, rows: Goal[]) => {
						if (err) {
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						} else {
							resolve(reply.send({
								success: true,
								goals: rows
							}));
						}
					}
				);
			});
		}
	);
}
