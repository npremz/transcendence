import { FastifyInstance } from 'fastify'
import { RoomManager } from './RoomManager'
import { Player, ClientMessage, ServerMessage } from './types'
import { v4 as uuidv4 } from 'uuid'

const roomManager = new RoomManager()

const isDevelopment = process.env.NODE_ENV === 'development'
const agent = isDevelopment ? new https.Agent({ rejectUnauthorized: false }) : undefined

export function handleQuickPlay(fastify: FastifyInstance)
{
	fastify.get('/ws', { websocket: true }, (connection, request) => {
		console.log(`New WebSocket connexion /quickplay/ws`)

		let currentPlayer: Player | null = null

		connection.on('message', (rawMessage) => {
			try
			{
				const msg: ClientMessage = JSON.parse(rawMessage.toString())
				console.log(`Message received: `, msg)

				switch (msg.type)
				{
					case 'join_quickplay':
						handleJoinQuickplay(msg.username)
						break
					case 'player_ready':
						handlePlayerReady()
						break
					case 'player_input':
						handlePlayerInput(msg.input)
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
			console.log(`Disconnection of ${currentPlayer?.username || 'unknown player'}`)
			if (currentPlayer)
			{
				roomManager.removePlayerFromRoom(currentPlayer)
				roomManager.debugRooms();
			}
		})

		async function handleJoinQuickplay(username: string)
		{
			if (currentPlayer)
			{
				sendError(`You are in the room already`)
				return
			}

			currentPlayer = {
				id: uuidv4(),
				username: username,
				socket: connection,
				isReady: false
			}

			console.log(`New player: ${username} (${currentPlayer.id})`)

			const room = roomManager.findOrCreateRoom(currentPlayer)

			if (room.status === `waiting`)
			{
				sendMessage({ type: `waiting_for_opponent`})
				console.log(`${username} is waiting for opposant in room ${room.id}`)
			}
			else if (room.status === `playing`)
			{
				const player1 = room.players[0]
				const player2 = room.players[1]

				const host = process.env.VITE_HOST
				const create_endpoint = process.env.VITE_CREATEGAME_ENDPOINT
				const game_endpoint = process.env.VITE_GAME_ENDPOINT
				const fetchURL = (host && create_endpoint) ? `https://${host}${create_endpoint}`
								: `https://localhost:8443/gameback/create`
				try {
					console.log(fetchURL)
					await fetch(fetchURL, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							roomId: room.id,
							player1: { id: player1.id, username: player1.username },
							player2: { id: player2.id, username: player2.username },
						}),
						agent: agent
					})
					console.log(`Game initialized in gameback for room ${room.id}`)
				} 
				catch (err)
				{
					console.log(`failed to initialize room ${room.id}`, err)
				}
                const baseGameWs = (host && game_endpoint) ? 
                                        `wss://${host}${game_endpoint}/${room.id}` :
                                        `wss://localhost:8443/gameback/game/${room.id}`;
                const urlFor = (p: Player) => `${baseGameWs}?playerId=${encodeURIComponent(p.id)}&username=${encodeURIComponent(p.username)}`

				player1.socket.send(JSON.stringify({
					type: `game_start`,
					roomId: room.id,
					playerNumber: 1,
					gameSeverURL: urlFor(player1)
				}))

				player2.socket.send(JSON.stringify({
					type: `game_start`,
					roomId: room.id,
					playerNumber: 2,
					gameSeverURL: urlFor(player2)
				}))

				console.log(`Game starde in room ${room.id}!`)
				console.log(`- Player 1: ${player1.username}`)
				console.log(`- Player 2: ${player2.username}`)
			}

			roomManager.debugRooms()
		}

		function handlePlayerReady()
		{
			if (!currentPlayer)
			{
				sendError(`You must join a game first to be ready`)
				return
			}

			currentPlayer.isReady = true
			console.log(`${currentPlayer.username} is ready`)
		}

		function handlePlayerInput(input: any)
		{
			if (!currentPlayer || !currentPlayer.roomId)
			{
				sendError(`You are not in a game session`)
				return
			}
			console.log(`Input of ${currentPlayer.username}: `, input)

			// TODO
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
