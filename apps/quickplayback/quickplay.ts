import { FastifyInstance } from 'fastify'
import { RoomManager } from './RoomManager'
import { Player, ClientMessage, ServerMessage } from './types'
import type { RoomFinishedPayload } from './types'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'

const isDevelopment = process.env.NODE_ENV === 'development'
const agent = isDevelopment ? new https.Agent({ rejectUnauthorized: false }) : undefined

async function callDatabase(endpoint: string, method: string = 'GET', body?: any) {
	const host = process.env.VITE_HOST || 'localhost:8443';
	const url = `https://${host}/gamedb${endpoint}`;
	
	const options: RequestInit = {
		method,
		// @ts-ignore
		agent
	};

	if (body && method !== 'GET') {
		options.headers = { 'Content-Type': 'application/json' };
		options.body = JSON.stringify(body);
	}
	
	if (body && method !== 'GET') {
		options.body = JSON.stringify(body);
	}
	
	const response = await fetch(url, options);
	return response.json();
}

export function handleQuickPlay(fastify: FastifyInstance, roomManager: RoomManager)
{
	fastify.post('/join', async (request, reply) => {
		const { username, playerId } = request.body as { username: string; playerId: string };
		
		if (!username || !playerId) {
			return reply.code(400).send({ error: 'Username and playerId required' });
		}

		try
		{
			await callDatabase('/users', 'POST', {
				id: playerId,
				username
			});
		}
		catch (err)
		{
			console.log('User already exists or DB error:', err);
		}

		await callDatabase(`/users/${playerId}/last-seen`, 'PATCH');

		const player: Player = {
			id: playerId,
			username,
			isReady: false
		};

		const room = roomManager.findOrCreateRoom(player);
		
		if (room.players.length === 2)
		{
			const host = process.env.VITE_HOST;
			const create_endpoint = process.env.VITE_CREATEGAME_ENDPOINT;
			const fetchURL = `https://${host || 'localhost:8443'}${create_endpoint || '/gameback/create'}`;

			const gameId = uuidv4();
			
			try
			{
				await callDatabase('/games', 'POST', {
					id: gameId,
					room_id: room.id,
					game_type: 'quickplay',
					player_left_id: room.players[0].id,
					player_right_id: room.players[1].id
				});

				await fetch(fetchURL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						roomId: room.id,
						player1: { id: room.players[0].id, username: room.players[0].username },
						player2: { id: room.players[1].id, username: room.players[1].username },
					}),
					agent
				});
				room.status = 'playing';
			}
			catch (err)
			{
				fastify.log.error(err);
				return reply.code(500).send({ error: 'Failed to initialize game' });
			}
		}

		return { success: true, roomId: room.id, status: room.status };
	});

	fastify.get('/status/:roomId', async (request, reply) => {
		const { roomId } = request.params as { roomId: string };
		const room = roomManager.getRoom(roomId);
		
		if (!room)
		{
			return reply.code(404).send({ error: 'Room not found' });
		}

		if (room.status === 'playing')
		{
			const host = process.env.VITE_HOST;
			const game_endpoint = process.env.VITE_GAME_ENDPOINT;
			const baseGameWs = `wss://${host || 'localhost:8443'}${game_endpoint || '/gameback/game'}/${roomId}`;
			
			return {
				success: true,
				status: 'ready',
				roomId,
				gameServerURL: baseGameWs,
				players: room.players.length,
				isTournament: room.isTournament || false,
				tournamentId: room.tournamentId,
				matchId: room.matchId
			};
		}

		return { 
			success: true,
			status: room.status, 
			players: room.players.length,
			maxPlayers: 2
		};
	});

	fastify.post('/room-finished', async (request, reply) => {
		try
		{
			const body = request.body as Partial<RoomFinishedPayload> | undefined;
			if (!body || !body.roomId)
			{
				return reply.code(400).send({ success: false, error: 'Invalid payload' });
			}

			fastify.log.info({
			route: '/room-finished',
			body
			}, 'room-finished received');

			const room = roomManager.getRoom(body.roomId);
			
			if (room && body.winner && body.score) {
				const gameData = await callDatabase(`/games/room/${body.roomId}`);
				
				if (gameData.success && gameData.game)
				{
					try
					{
						const gameData = await callDatabase(`/games/room/${body.roomId}`);
						
						if (gameData.success && gameData.game)
						{
							const gameId = gameData.game.id;
							
							if (gameData.game.status === 'waiting')
							{
								await callDatabase(`/games/room/${body.roomId}/start`, 'PATCH');
								fastify.log.info('Game started before finishing');
							}
							
							const finishResult = await callDatabase(`/games/room/${body.roomId}/finish`, 'PATCH', {
								score_left: body.score.left,
								score_right: body.score.right,
								winner_id: body.winner.id,
								end_reason: body.reason
							});
							
							if (!finishResult.success)
							{
								fastify.log.error({ finishResult }, 'Failed to finish game in DB');
							}

							const isLeftWinner = body.winner.id === room.players[0].id;
							
							await callDatabase(`/users/${room.players[0].id}/stats`, 'PATCH', {
								won: isLeftWinner
							});
							
							await callDatabase(`/users/${room.players[1].id}/stats`, 'PATCH', {
								won: !isLeftWinner
							});
						}
					}
					catch (err)
					{
						fastify.log.error({ err }, 'Error updating game in database');
					}
				}
			}

			const deleted = roomManager.deleteRoom(body.roomId);
			return reply.send({ success: true, deleted });
		}
		catch (err)
		{
			fastify.log.error(err);
			return reply.code(500).send({ success: false, error: 'Internal server error' });
		}
	})
}
