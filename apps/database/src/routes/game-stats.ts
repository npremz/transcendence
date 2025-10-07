import type { FastifyInstance } from 'fastify';

interface GameStat {
	id?: number;
	game_id: string;
	player_id: string;
	side: 'left' | 'right';
	paddle_hits?: number;
	smashes_used?: number;
	max_ball_speed?: number;
	power_ups_collected?: number;
	time_disconnected_ms?: number;
}

export function registerGameStatsRoutes(fastify: FastifyInstance): void
{
	// CREATE - Enregistrer les stats d'une partie
	fastify.post<{ Body: GameStat }>(
		'/game-stats',
		async (request, reply) => {
			const {
				game_id,
				player_id,
				side,
				paddle_hits = 0,
				smashes_used = 0,
				max_ball_speed = 0,
				power_ups_collected = 0,
				time_disconnected_ms = 0
			} = request.body;

			if (!game_id || !player_id || !side)
			{
				return reply.status(400).send({
					success: false,
					error: 'game_id, player_id, and side are required'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO game_stats (
						game_id, player_id, side, paddle_hits, smashes_used,
						max_ball_speed, power_ups_collected, time_disconnected_ms
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						game_id, player_id, side, paddle_hits, smashes_used,
						max_ball_speed, power_ups_collected, time_disconnected_ms
					],
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
								stat_id: this.lastID
							}));
						}
					}
				);
			});
		}
	);

	// READ - Stats d'une partie
	fastify.get<{ Params: { gameId: string } }>(
		'/game-stats/game/:gameId',
		async (request, reply) => {
			const { gameId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT gs.*, u.username
					FROM game_stats gs
					JOIN users u ON gs.player_id = u.id
					WHERE gs.game_id = ?`,
					[gameId],
					(err, rows: GameStat[]) => {
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
								stats: rows
							}));
						}
					}
				);
			});
		}
	);

	// READ - Stats d'un joueur (agrégées)
	fastify.get<{ Params: { playerId: string } }>(
		'/game-stats/player/:playerId/aggregate',
		async (request, reply) => {
			const { playerId } = request.params;

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT 
						COUNT(*) as total_games,
						SUM(paddle_hits) as total_paddle_hits,
						SUM(smashes_used) as total_smashes,
						MAX(max_ball_speed) as highest_ball_speed,
						SUM(power_ups_collected) as total_power_ups,
						AVG(paddle_hits) as avg_paddle_hits,
						AVG(smashes_used) as avg_smashes
					FROM game_stats
					WHERE player_id = ?`,
					[playerId],
					(err, row) => {
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
								aggregate_stats: row
							}));
						}
					}
				);
			});
		}
	);
}
