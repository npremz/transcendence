import Fastify, { FastifyInstance, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { getSessionForRoom } from './session/session'

export const handleGame = (conn: WebSocket, _req: FastifyRequest, fastify: FastifyInstance) : void => {
	fastify.log.info({ url: _req.url, params: _req.params, query: _req.query }, 'WS connect');
    const {roomId} = (_req.params ?? {}) as {roomId?: string};

    const room = getSessionForRoom(roomId || '', fastify.log);
    if (!room)
    {
        fastify.log.warn(`Closing connection to invalid room: ${roomId}`);
        conn.close(1008, 'Room does not exist');
        return;
    }
    room.addClient(conn);
}
