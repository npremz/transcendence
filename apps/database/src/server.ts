import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import database from './database/connection'
import { registerUserRoutes } from './routes/users'
import { registerTournamentRoutes } from './routes/tournaments'
import { registerTournamentRegistrationRoutes } from './routes/tournament-registrations'
import { registerGameRoutes } from './routes/games'
import { registerGameStatsRoutes } from './routes/game-stats'
import { registerPowerUpRoutes } from './routes/power-ups'
import { registerSkillRoutes } from './routes/skills'
import { registerGoalRoutes } from './routes/goals'

const fastify: FastifyInstance = Fastify({
	logger: true
})

fastify.register(cors, {
	origin: true,
	credentials: true
})

declare module 'fastify'
{
	interface FastifyInstance
	{
		db: import('sqlite3').Database
	}
}

fastify.setErrorHandler((error, request, reply) => {
	fastify.log.error(error)
	reply.status(500).send({
		success: false,
		error: 'Internal server error'
	})
})

// Cache pour les stats globales
let statsCache: any = null;
let lastStatsFetch = 0;
const CACHE_DURATION = 5000; // 5 secondes

const start = async (): Promise<void> => {
	try
	{
		await database.connect()
		await database.init()

		// Adding db to fastify instance
		fastify.decorate('db', database.getDb())

		registerUserRoutes(fastify)
		registerTournamentRoutes(fastify)
		registerTournamentRegistrationRoutes(fastify)
		registerGameRoutes(fastify)
		registerGameStatsRoutes(fastify)
		registerPowerUpRoutes(fastify)
		registerSkillRoutes(fastify)
		registerGoalRoutes(fastify)

		// Route pour les statistiques globales
		fastify.get('/stats/global', async (request, reply) => {
			const now = Date.now();
			
			// Retourner le cache si toujours valide
			if (statsCache && (now - lastStatsFetch) < CACHE_DURATION) {
				return reply.send(statsCache);
			}

			return new Promise((resolve) => {
				fastify.db.get(
					`SELECT COUNT(*) as total_users FROM users`,
					[],
					(err, userCount: any) => {
						if (err) {
							resolve(reply.status(500).send({
								success: false,
								error: err.message
							}));
							return;
						}

						fastify.db.get(
							`SELECT COUNT(*) as active_games FROM games 
							 WHERE status = 'in_progress'`,
							[],
							(err2, gameCount: any) => {
								if (err2) {
									resolve(reply.status(500).send({
										success: false,
										error: err2.message
									}));
									return;
								}

								fastify.db.get(
									`SELECT COUNT(*) as online_players FROM users 
									 WHERE last_seen >= datetime('now', '-5 minutes')`,
									[],
									(err3, onlineCount: any) => {
										if (err3) {
											resolve(reply.status(500).send({
												success: false,
												error: err3.message
											}));
											return;
										}

										const result = {
											success: true,
											stats: {
												total_users: userCount.total_users,
												active_games: gameCount.active_games,
												online_players: onlineCount.online_players
											}
										};

										// Mettre en cache
										statsCache = result;
										lastStatsFetch = now;

										resolve(reply.send(result));
									}
								);
							}
						);
					}
				);
			});
		});

		await fastify.listen({
			port: 3020,
			host: '0.0.0.0'
		})
		console.log('Database API service running on port 3020')
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}

process.on('SIGINT', async () => {
	console.log('Shutting down database API service...')
	await fastify.close()
	process.exit()
})

start()

fastify.get('/health', async (request, reply) => {
	return {
		status: 'ok',
		timestamp: new Date().toISOString(),
		service: 'database'
	}
})
