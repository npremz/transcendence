import { FastifyInstance } from 'fastify'
import { RoomManager } from './RoomManager'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'

const isDevelopment = process.env.NODE_ENV === 'development'
const agent = isDevelopment ? new https.Agent({ rejectUnauthorized: false }) : undefined

export function handleTournamentQuickPlay(fastify: FastifyInstance, roomManager: RoomManager)
{
	fastify.post('/tournament-match', async (request, reply) => {
		const { matchId, tournamentId, player1, player2 } = request.body as {
			matchId: string;
			tournamentId: string;
			player1: { id: string; username: string };
			player2: { id: string; username: string };
		};

		if (!matchId || !tournamentId || !player1 || !player2)
		{
			return reply.code(400).send({ error: 'Invalid payload' });
		}

		const roomId = uuidv4();

		console.log(`Creating tournament match: ${player1.username} vs ${player2.username} (roomId: ${roomId})`);

		try
		{
			const room = roomManager.createTournamentRoom(
                roomId,
                { id: player1.id, username: player1.username, isReady: true },
                { id: player2.id, username: player2.username, isReady: true },
                tournamentId,
                matchId
            );

			const host = process.env.VITE_HOST || 'localhost:8443';
			const create_endpoint = process.env.VITE_CREATEGAME_ENDPOINT || '/gameback/create';
			const fetchURL = `https://${host}${create_endpoint}`;

			await fetch(fetchURL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					roomId,
					player1,
					player2,
					isTournament: true,
					tournamentId,
					matchId
				}),
				// @ts-ignore
				agent
			});

			console.log(`Tournament match created successfully: roomId=${roomId}`);

			return { 
				success: true, 
				roomId,
				matchId 
			};
		}
		catch (err)
		{
			fastify.log.error(err);
			return reply.code(500).send({ error: 'Failed to initialize game' });
		}
	});
}
