import Fastify, { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'

const connectedClients = new Set<WebSocket>()

function broadcastToAll(message: string): void
{
	connectedClients.forEach((client: WebSocket) => {
		if (client.readyState === client.OPEN)
		{
			client.send(message);
		}
	})
}

export const handleChat = (socket, req, fastify: FastifyInstance) : void => {
	connectedClients.add(socket);
	fastify.log.info(`Clients connected: ${connectedClients.size}`)

	socket.on('message', message =>
		{
			const msgStr = message.toString()
			fastify.log.info(`Message received: ${msgStr}`)

			broadcastToAll(`Client said: ${msgStr}`)
		}
	)

	socket.on('close', () => {
		connectedClients.delete(socket)
		fastify.log.info(`Client disconnected, ${connectedClients.size} clients left.`)
	})

	socket.on('error', (err) => {
		fastify.log.error('WebSocket error:', err)
		connectedClients.delete(socket)
	})
}
