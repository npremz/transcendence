import Fastify, { FastifyInstance, FastifyRequest } from 'fastify'
import { WebSocket } from '@fastify/websocket'
import { getSession } from './session/session'

export const handleGame = (conn: WebSocket, _req: FastifyRequest, fastify: FastifyInstance) : void => {
	getSession(fastify.log).addClient(conn);
}
