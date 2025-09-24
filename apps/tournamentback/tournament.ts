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
		let currentPlayerId: string | null = null;

		sendMessage({type: 'update', registrations: tournamentManager.getCurrentRegistrations()})

		connection.on('message', (rawMessage) => {
			try
			{
				const msg: ClientMessage = JSON.parse(rawMessage.toString())
				console.log(`Message received: `, msg)

				switch (msg.type)
				{
					case 'join':
						currentPlayerId = msg.playerId;
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

        connection.on('close', () => {
            console.log('WebSocket connection closed');
            if (currentPlayerId)
			{
                tournamentManager.removePlayerConnection(currentPlayerId);
                const removed = tournamentManager.removePlayerFromAllRegistrations(currentPlayerId);
                if (removed)
				{
                    console.log(`Player ${currentPlayerId} removed from all registrations due to connection close`);
                }
            }
        });

		function handleJoinTournament(msg: ClientMessage, socket: WebSocket)
		{
			tournamentManager.setPlayerConnection(msg.playerId, socket);

			const newPlayer : Player= {
				id: msg.playerId,
				username: msg.username,
				currentTournament: msg.tournamentId,
				isEleminated: false,
			}
			tournamentManager.registerPlayer(msg.tournamentId, newPlayer);

			const success = tournamentManager.registerPlayer(msg.tournamentId, newPlayer);
            if (success)
			{
                console.log(`Player ${msg.username} (${msg.playerId}) switched to tournament ${msg.tournamentId}`)
            }
			else
			{
                sendError(`Cannot join tournament: tournament full or unavailable`)
            }
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

	fastify.get('/tournament/:id/brackets', async (request, reply) => {
        const { id } = request.params as { id: string };
        
        const brackets = tournamentManager.getTournamentBrackets(id);
        
        if (!brackets)
		{
            return reply.status(404).send({ error: 'Tournament not found' });
        }
        
        return { tournamentId: id, brackets };
    });

    fastify.get('/tournament/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        
        const tournament = tournamentManager.getTournamentDetails(id);
        
        if (!tournament)
		{
            return reply.status(404).send({ error: 'Tournament not found' });
        }
        
        return tournament;
    });
}
