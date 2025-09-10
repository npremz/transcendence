import Fastify, { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'

const connectedClients = new Set<WebSocket>()
const msgHistory: string[] = []
const MAX_HISTORY_SIZE = 50

function broadcastToAll(message: string): void
{
	connectedClients.forEach((client: WebSocket) => {
		if (client.readyState === client.OPEN)
		{
			client.send(message);
		}
	})
}

function addToHistory(msg: string): void
{
	msgHistory.push(msg)

	if (msgHistory.length > MAX_HISTORY_SIZE)
	{
		msgHistory.shift()
	}
}

function sendHistoryToClient(socket: WebSocket): void
{
	if (msgHistory.length > 0)
	{
		msgHistory.forEach(msg => {
			if (socket.readyState === socket.OPEN)
			{
				socket.send(msg)
			}
		})
	}
}

function clearHistoryIfEmpty(): void {
	if (connectedClients.size === 0)
	{
		msgHistory.length = 0
	}
}

export const handleChat = (socket, req, fastify: FastifyInstance) : void => {
	connectedClients.add(socket);
	fastify.log.info(`Clients connected: ${connectedClients.size}`)

	sendHistoryToClient(socket)

	socket.on('message', message =>
		{
			const msgStr = message.toString()
			fastify.log.info(`Message received: ${msgStr}`)

			const formattedMsg = `Client said: ${msgStr}`

			addToHistory(formattedMsg)
			broadcastToAll(formattedMsg)
		}
	)

	socket.on('close', () => {
		connectedClients.delete(socket)
		fastify.log.info(`Client disconnected, ${connectedClients.size} clients left.`)
		clearHistoryIfEmpty()
	})

	socket.on('error', (err) => {
		fastify.log.error('WebSocket error:', err)
		connectedClients.delete(socket)
		clearHistoryIfEmpty()
	})
}
