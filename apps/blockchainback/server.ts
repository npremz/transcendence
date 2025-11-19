import Fastify from 'fastify'
import { BlockchainService } from './BlockchainService'

const fastify = Fastify({
	logger: true
})

const blockchainService = new BlockchainService()

const initServer = async () => {
	await blockchainService.initialize()

	fastify.post('/register-tournament', async (request, reply) => {
		const { tournamentId, tournamentName, maxPlayers, winnerId, winnerUsername } = request.body as {
			tournamentId: string
			tournamentName: string
			maxPlayers: number
			winnerId: string
			winnerUsername: string
		}

		if (!tournamentId || !tournamentName || !maxPlayers || !winnerId || !winnerUsername) {
			return reply.status(400).send({
				success: false,
				error: 'Missing required fields: tournamentId, tournamentName, maxPlayers, winnerId, winnerUsername'
			})
		}

		try {
			const txHash = await blockchainService.registerTournament(
				tournamentId,
				tournamentName,
				maxPlayers,
				winnerId,
				winnerUsername
			)

			fastify.log.info(`Tournament ${tournamentId} registered on blockchain: ${txHash}`)

			return {
				success: true,
				transactionHash: txHash,
				message: 'Tournament registered on blockchain'
			}
		} catch (error) {
			fastify.log.error('Error registering tournament:', error)
			return reply.status(500).send({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	})

	fastify.get('/tournament/:tournamentId', async (request, reply) => {
		const { tournamentId } = request.params as { tournamentId: string }

		try {
			const tournament = await blockchainService.getTournament(tournamentId)

			if (!tournament) {
				return reply.status(404).send({
					success: false,
					error: 'Tournament not found on blockchain'
				})
			}

			return {
				success: true,
				tournament
			}
		} catch (error) {
			fastify.log.error('Error fetching tournament:', error)
			return reply.status(500).send({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	})

	fastify.get('/tournaments/count', async (request, reply) => {
		try {
			const count = await blockchainService.getTournamentCount()
			return {
				success: true,
				count
			}
		} catch (error) {
			fastify.log.error('Error fetching tournament count:', error)
			return reply.status(500).send({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	})

	fastify.get('/tournaments/all', async (request, reply) => {
        try {
            const dbResponse = await fetch('http://database:3020/tournaments');
            const dbData = await dbResponse.json();

            if (!dbData.success || !Array.isArray(dbData.tournaments)) {
                throw new Error('Failed to fetch tournaments from DB');
            }

            const finishedTournamentIds = dbData.tournaments
                .filter((t: any) => t.status === 'finished')
                .map((t: any) => t.id);

            if (finishedTournamentIds.length === 0) {
                return { success: true, tournaments: [] };
            }

            const blockchainTournaments = await blockchainService.getManyTournaments(finishedTournamentIds);

            blockchainTournaments.sort((a, b) => {
                return Number(b.data.timestamp) - Number(a.data.timestamp);
            });

            return {
                success: true,
                tournaments: blockchainTournaments
            };

        } catch (error) {
            fastify.log.error('Error fetching all tournaments:', error);
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

	fastify.get('/health', async (request, reply) => {
		const isConnected = blockchainService.isConnected()
		return {
			status: isConnected ? 'ok' : 'degraded',
			service: 'blockchain-backend',
			blockchain: isConnected ? 'connected' : 'disconnected'
		}
	})

	fastify.listen({ port: 3070, host: '0.0.0.0' }, function (err, address) {
		if (err) {
			fastify.log.error(err)
			process.exit(1)
		}
		fastify.log.info(`Blockchain service listening on ${address}`)
	})
}

initServer()
