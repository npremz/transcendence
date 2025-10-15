import type { FastifyInstance } from 'fastify';

interface SkillUsed {
	id?: number;
	game_id: string;
	player_id: string;
	skill_type: 'smash' | 'dash';
	activated_at_game_time: number;
	activated_at?: string;
	was_successful?: boolean;
}

export function registerSkillRoutes(fastify: FastifyInstance): void
{
	// CREATE - Enregistrer l'utilisation d'un skill
	fastify.post<{ Body: {
		game_id: string;
		player_id: string;
		skill_type: 'smash' | 'dash';
		activated_at_game_time: number;
		was_successful?: boolean;
	}}>(
		'/skills',
		async (request, reply) => {
			const { game_id, player_id, skill_type, activated_at_game_time, was_successful = true } = request.body;

			if (!game_id || !player_id || !skill_type || activated_at_game_time === undefined) {
				return reply.status(400).send({
					success: false,
					error: 'game_id, player_id, skill_type, and activated_at_game_time are required'
				});
			}

			return new Promise((resolve) => {
				fastify.db.run(
					`INSERT INTO skills_used (
						game_id, player_id, skill_type, activated_at_game_time, was_successful
					) VALUES (?, ?, ?, ?, ?)`,
					[game_id, player_id, skill_type, activated_at_game_time, was_successful ? 1 : 0],
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
								skill_id: this.lastID
							}));
						}
					}
				);
			});
		}
	);

	// READ - Skills utilisés dans une partie
	fastify.get<{ Params: { gameId: string } }>(
		'/skills/game/:gameId',
		async (request, reply) => {
			const { gameId } = request.params;

			return new Promise((resolve) => {
				fastify.db.all(
					`SELECT s.*, u.username
					FROM skills_used s
					JOIN users u ON s.player_id = u.id
					WHERE s.game_id = ?
					ORDER BY s.activated_at_game_time ASC`,
					[gameId],
					(err, rows: SkillUsed[]) => {
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
								skills: rows
							}));
						}
					}
				);
			});
		}
	);

	// READ - Stats skills d'un joueur
	fastify.get<{ Params: { playerId: string } }>(
		'/skills/player/:playerId/stats',
		async (request, reply) => {
			const { playerId } = request.params;

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT 
						COUNT(CASE WHEN skill_type = 'smash' THEN 1 END) as total_smashes,
						SUM(CASE WHEN skill_type = 'smash' AND was_successful = 1 THEN 1 ELSE 0 END) as successful_smashes,
						ROUND(AVG(CASE WHEN skill_type = 'smash' AND was_successful = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as smash_success_rate,
						COUNT(CASE WHEN skill_type = 'dash' THEN 1 END) as total_dashes,
						SUM(CASE WHEN skill_type = 'dash' AND was_successful = 1 THEN 1 ELSE 0 END) as successful_dashes,
						ROUND(AVG(CASE WHEN skill_type = 'dash' AND was_successful = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as dash_success_rate
					FROM skills_used
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
								skill_stats: row
							}));
						}
					}
				);
			});
		}
	);
}
