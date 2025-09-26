import { FastifyInstance } from 'fastify'
import { RoomManager } from './RoomManager'
import { Player, ClientMessage, ServerMessage } from './types'
import { v4 as uuidv4 } from 'uuid'
import { roomManager } from './quickplay'


export function handleTournamentQuickPlay(fastify: FastifyInstance)
{
	fastify.post('/tournament-match', (request, reply) => {

	})
}
