import type { FastifyInstance } from 'fastify';

interface Game {
	id: string;
	room_id: string;
	game_type: 'quickplay' | 'tournament';
	tournament_id?: string;
	tournament_round?: number;
	match_position?: number;
	player_left_id: string;
	player_right_id: string;
	score_left?: number;
	score_right?: number;
	winner_id?: string;
	status: 'waiting' | 'in_progress' | 'finished' | 'abandoned';
	end_reason?: 'score' | 'timeout' | 'forfeit';
	created_at?: string;
	started_at?: string;
	finished_at?: string;
	duration_seconds?: number;
}

export function registerGameRoutes(fastify: FastifyInstance): void
{
	// CREATE - Créer une partie
	fastify.post<{ Body: {
		id: string;
		room_id: string;
		game_type: 'quickplay' | 'tournament';
		player_left_id: string;
		player_right_id: string;
		tournament_id?: string;
		tournament_round?: number;
		match_position?: number;
	}}>(
		'/games',
		async (request, reply) => {
			const {
				id,
				room_id,
				game_type,
				player_left_id,
				player_right_id,
				tournament_id,
				tournament_round,
				match_position
			} = request.body;

			if (!id || !room_id || !game_type || !player_left_id || !player_right_id)
			{
				return reply.status(400).send({
					success: false,
					error: 'Missing required fields'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO games (
						id, room_id, game_type, player_left_id, player_right_id,
						tournament_id, tournament_round, match_position, status
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`,
					[
						id, room_id, game_type, player_left_id, player_right_id,
						tournament_id || null, tournament_round || null, match_position || null
					],
					function(err)
					{
						if (err)
						{
							fastify.log.error({ 
								err, 
								game_data: { id, room_id, game_type, player_left_id, player_right_id }
							}, 'Failed to create game in database');
							
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						else
						{
							resolve(reply.send({
								success: true,
								game: { id, room_id, status: 'waiting' }
							}));
						}
					}
				);
			});
		}
	);

	// READ - Récupérer une partie par room_id
	fastify.get<{ Params: { roomId: string } }>(
		'/games/room/:roomId',
		async (request, reply) => {
			const { roomId } = request.params;

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT g.*,
						u1.username as player_left_username,
						u2.username as player_right_username,
						u3.username as winner_username
					FROM games g
					LEFT JOIN users u1 ON g.player_left_id = u1.id
					LEFT JOIN users u2 ON g.player_right_id = u2.id
					LEFT JOIN users u3 ON g.winner_id = u3.id
					WHERE g.room_id = ?`,
					[roomId],
					(err, row: Game) => {
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
								error: 'Game not found'
							}));
						}
						else
						{
							// Log warning if usernames are missing (indicates missing users)
							if (!row.player_left_username || !row.player_right_username)
							{
								console.warn(`Game ${roomId}: Missing player usernames. Left: ${row.player_left_username}, Right: ${row.player_right_username}, Player IDs: ${(row as any).player_left_id}, ${(row as any).player_right_id}`);
							}
							
							resolve(reply.send({
								success: true,
								game: row
							}));
						}
					}
				);
			});
		}
	);

	// UPDATE - Démarrer une partie
	fastify.patch<{ Params: { roomId: string } }>(
		'/games/room/:roomId/start',
		async (request, reply) => {
			const { roomId } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE games SET 
						status = 'in_progress',
						started_at = CURRENT_TIMESTAMP
					WHERE room_id = ? AND status = 'waiting'`,
					[roomId],
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
								error: 'Game not found or already started'
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

	// UPDATE - Terminer une partie
	fastify.patch<{ 
		Params: { roomId: string };
		Body: {
			score_left: number;
			score_right: number;
			winner_id: string;
			end_reason: 'score' | 'timeout' | 'forfeit';
		}
	}>(
		'/games/room/:roomId/finish',
		async (request, reply) => {
			const { roomId } = request.params;
			const { score_left, score_right, winner_id, end_reason } = request.body;

			if (score_left === undefined || score_right === undefined || !winner_id || !end_reason)
			{
				return reply.status(400).send({
					success: false,
					error: 'Missing required fields'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`UPDATE games SET 
						status = 'finished',
						score_left = ?,
						score_right = ?,
						winner_id = ?,
						end_reason = ?,
						finished_at = CURRENT_TIMESTAMP,
						duration_seconds = (
							CAST((julianday(CURRENT_TIMESTAMP) - julianday(created_at)) * 86400 AS INTEGER)
						)
					WHERE room_id = ? AND (status = 'in_progress' OR status = 'waiting')`,
					[score_left, score_right, winner_id, end_reason, roomId],
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
								error: 'Game not found or not in progress'
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

	// READ - Historique global de tous les joueurs
	fastify.get(
		'/games/history',
		async (request, reply) => {
			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT g.*,
						u1.username as player_left_username,
						u2.username as player_right_username,
						u3.username as winner_username
					FROM games g
					JOIN users u1 ON g.player_left_id = u1.id
					JOIN users u2 ON g.player_right_id = u2.id
					LEFT JOIN users u3 ON g.winner_id = u3.id
					WHERE g.status = 'finished'
					ORDER BY g.created_at DESC
					LIMIT 100`,
					[],
					(err, rows: Game[]) => {
						if (err) {
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						} else {
							resolve(reply.send({
								success: true,
								games: rows
							}));
						}
					}
				);
			});
		}
	);

	// READ - Historique d'un joueur
	fastify.get<{ Params: { playerId: string } }>(
		'/games/player/:playerId/history',
		async (request, reply) => {
			const { playerId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT g.*,
						u1.username as player_left_username,
						u2.username as player_right_username,
						CASE 
							WHEN g.winner_id = ? THEN 'won'
							WHEN g.winner_id IS NOT NULL THEN 'lost'
							ELSE 'ongoing'
						END as result
					FROM games g
					JOIN users u1 ON g.player_left_id = u1.id
					JOIN users u2 ON g.player_right_id = u2.id
					WHERE g.player_left_id = ? OR g.player_right_id = ?
					ORDER BY g.created_at DESC
					LIMIT 50`,
					[playerId, playerId, playerId],
					(err, rows: Game[]) => {
						if (err) {
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						} else {
							resolve(reply.send({
								success: true,
								games: rows
							}));
						}
					}
				);
			});
		}
	);

	// READ - Récupérer les détails complets d'une partie par son ID
	fastify.get<{ Params: { id: string } }>(
		'/games/:id',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT g.*,
						u1.username as player_left_username,
						u2.username as player_right_username,
						u3.username as winner_username
					FROM games g
					JOIN users u1 ON g.player_left_id = u1.id
					JOIN users u2 ON g.player_right_id = u2.id
					LEFT JOIN users u3 ON g.winner_id = u3.id
					WHERE g.id = ?`,
					[id],
					(err, game: any) => {
						if (err) {
							return resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
						}
						if (!game) {
							return resolve(reply.status(404).send({
								success: false,
								error: 'Game not found'
							}));
						}

						fastify.db.all(
							`SELECT gs.*, u.username
							FROM game_stats gs
							JOIN users u ON gs.player_id = u.id
							WHERE gs.game_id = ?`,
							[id],
							(err, stats: any[]) => {
								if (err) {
									return resolve(reply.status(500).send({
										success: false,
										error: err.message
									}));
								}

								fastify.db.all(
									`SELECT su.*, u.username
									FROM skills_used su
									JOIN users u ON su.player_id = u.id
									WHERE su.game_id = ?
									ORDER BY su.activated_at_game_time`,
									[id],
									(err, skills: any[]) => {
										if (err) {
											return resolve(reply.status(500).send({
												success: false,
												error: err.message
											}));
										}

										fastify.db.all(
											`SELECT pu.*, u.username
											FROM power_ups_used pu
											JOIN users u ON pu.player_id = u.id
											WHERE pu.game_id = ?
											ORDER BY pu.activated_at_game_time`,
											[id],
											(err, powerUps: any[]) => {
												if (err) {
													return resolve(reply.status(500).send({
														success: false,
														error: err.message
													}));
												}

												fastify.db.all(
													`SELECT * FROM goals_scored
													WHERE game_id = ?
													ORDER BY scored_at_game_time`,
													[id],
													(err, goals: any[]) => {
														if (err) {
															return resolve(reply.status(500).send({
																success: false,
																error: err.message
															}));
														}

														resolve(reply.send({
															success: true,
															game: {
																...game,
																stats,
																skills,
																powerUps,
																goals
															}
														}));
													}
												);
											}
										);
									}
								);
							}
						);
					}
				);
			});
		}
	);

	// DELETE - Supprimer une partie (pour les tests uniquement)
	fastify.delete<{ Params: { id: string } }>(
		'/games/:id/delete',
		async (request, reply) => {
			const { id } = request.params;

			return new Promise((resolve) => {
				fastify.db.run(
					`DELETE FROM games WHERE id = ?`,
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
								error: 'Game not found'
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
