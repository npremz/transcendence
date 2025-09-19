import { FastifyInstance } from 'fastify'
import { TournamentManager } from './TournamentManager'
import { Player, ClientMessage, ServerMessage } from './types'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'

const roomManager = new TournamentManager()

const isDevelopment = process.env.NODE_ENV === 'development'
const agent = isDevelopment ? new https.Agent({ rejectUnauthorized: false }) : undefined

export function handleTournament(fastify: FastifyInstance)
{
	
}
