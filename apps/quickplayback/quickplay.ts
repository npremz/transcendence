import { FastifyInstance } from 'fastify'
import { RoomManager } from './RoomManager'
import { Player, ClientMessage, ServerMessage } from './types'
import type { RoomFinishedPayload } from './types'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'

export const roomManager = new RoomManager()

const isDevelopment = process.env.NODE_ENV === 'development'
const agent = isDevelopment ? new https.Agent({ rejectUnauthorized: false }) : undefined

export function handleQuickPlay(fastify: FastifyInstance)
{
	fastify.post('/join', async (request, reply) => {
		const { username, playerId } = request.body as { username: string; playerId: string };
		
		if (!username || !playerId) {
			return reply.code(400).send({ error: 'Username and playerId required' });
		}

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
			
			try
			{
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
				status: 'ready',
				roomId,
				playerNumber: 1,
				gameServerURL: `${baseGameWs}`
			};
		}

		return { status: room.status, players: room.players.length };
	});

	fastify.post('/room-finished', (request, reply) => {
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
