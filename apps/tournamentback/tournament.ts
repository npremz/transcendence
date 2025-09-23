import { FastifyInstance } from 'fastify'
import { TournamentManager } from './TournamentManager'
import { Player, ClientMessage, ServerMessage } from './types'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'

const tournamentManager = new TournamentManager()
tournamentManager.initTournaments()

const isDevelopment = process.env.NODE_ENV === 'development'
const agent = isDevelopment ? new https.Agent({ rejectUnauthorized: false }) : undefined

export function handleTournament(fastify: FastifyInstance)
{
	fastify.get('/ws', { websocket: true }, (connection, request) => {
		console.log(`New WebSocket connexion /tournamentback/ws`)

		sendMessage({type: 'update', registrations: tournamentManager.getCurrentRegistrations()})

		connection.on('message', (rawMessage) => {
			try
			{
				const msg: ClientMessage = JSON.parse(rawMessage.toString())
				console.log(`Message received: `, msg)

				switch (msg.type)
				{
					case 'join':
						handleJoinTournament(msg, connection)
						break
					default:
						sendError(`Unknown message type`)
				}
			}
			catch (err)
			{
				console.log(`Parse error:`, err)
				sendError(`Invalid input`)
			}
		})

		function handleJoinTournament(msg: ClientMessage, socket: WebSocket)
		{
			const newPlayer : Player= {
				id: uuidv4(),
				username: msg.username,
				currentTournament: msg.tournamentId,
				isEleminated: false,
				ws: socket
			}
			tournamentManager.registerPlayer(msg.tournamentId, newPlayer);
			console.log(`Player ${msg.username} registered to tournament ${msg.tournamentId}`)
			sendMessage({type: 'update', registrations: tournamentManager.getCurrentRegistrations()})
		}

		function sendMessage(message: ServerMessage)
		{
			try
			{
				connection.send(JSON.stringify(message))
			}
			catch (err)
			{
				console.error(`Response sending error:`, err)
			}
		}

		function sendError(errorMessage: string)
		{
			sendMessage({ type: 'error', message: errorMessage })
		}
	})
}
