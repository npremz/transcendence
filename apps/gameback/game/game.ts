import Fastify, { FastifyInstance, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { getSessionForRoom } from './session/session'

export const handleGame = (conn: WebSocket, _req: FastifyRequest, fastify: FastifyInstance) : void => {
	fastify.log.info({ url: _req.url, params: _req.params, query: _req.query }, 'WS connect');
    const {roomId} = (_req.params ?? {}) as {roomId?: string};
    const {playerId, username, playerNumber} = (_req.query ?? {}) as {playerId: string; username: string; playerNumber: string};

    const id = typeof playerId === 'string' ? playerId : undefined;
    const name = typeof username === 'string' ? username : undefined;
    const room = getSessionForRoom(roomId || 'default', fastify.log);
    room.addClient(conn, { id, username: name });
}
