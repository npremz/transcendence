import type { FastifyInstance } from 'fastify';

interface PowerUpUsed {
	id?: number;
	game_id: string;
	player_id: string;
	power_up_type: 'split' | 'blackout' | 'blackhole';
	activated_at_game_time: number;
	activated_at?: string;
}

export function registerPowerUpRoutes(fastify: FastifyInstance): void
{
	// CREATE - Enregistrer l'utilisation d'un power-up
	fastify.post<{ Body: {
		game_id: string;
		player_id: string;
		power_up_type: 'split' | 'blackout' | 'blackhole';
		activated_at_game_time: number;
	}}>(
		'/power-ups',
		async (request, reply) => {
			const { game_id, player_id, power_up_type, activated_at_game_time } = request.body;

			if (!game_id || !player_id || !power_up_type || activated_at_game_time === undefined) {
				return reply.status(400).send({
					success: false,
					error: 'All fields are required'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO power_ups_used (
						game_id, player_id, power_up_type, activated_at_game_time
					) VALUES (?, ?, ?, ?)`,
					[game_id, player_id, power_up_type, activated_at_game_time],
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
								powerup_id: this.lastID
							}));
						}
					}
				);
			});
		}
	);

	// READ - Power-ups d'une partie
	fastify.get<{ Params: { gameId: string } }>(
		'/power-ups/game/:gameId',
		async (request, reply) => {
			const { gameId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT pu.*, u.username
					FROM power_ups_used pu
					JOIN users u ON pu.player_id = u.id
					WHERE pu.game_id = ?
					ORDER BY pu.activated_at_game_time ASC`,
					[gameId],
					(err, rows: PowerUpUsed[]) => {
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
								power_ups: rows
							}));
						}
					}
				);
			});
		}
	);

	// READ - Stats power-ups d'un joueur
	fastify.get<{ Params: { playerId: string } }>(
		'/power-ups/player/:playerId/stats',
		async (request, reply) => {
			const { playerId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT 
						power_up_type,
						COUNT(*) as times_used
					FROM power_ups_used
					WHERE player_id = ?
					GROUP BY power_up_type`,
					[playerId],
					(err, rows) => {
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
								powerup_stats: rows
							}));
						}
					}
				);
			});
		}
	);
}
