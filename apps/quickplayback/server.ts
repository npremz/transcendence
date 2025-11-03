import Fastify from 'fastify'
import { handleQuickPlay } from './quickplay'
import { handleTournamentQuickPlay } from './TounamentQuickPlay'
import { RoomManager } from './RoomManager'

const fastify = Fastify({
	logger: true
})

export const roomManager = new RoomManager()

fastify.get('/', function (request, reply)
	{
		reply.send({ hello: 'world' })
	}
)

fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'quickplay-backend' };
});

handleQuickPlay(fastify, roomManager);
handleTournamentQuickPlay(fastify, roomManager)

fastify.listen({ port: 3030, host: '0.0.0.0'}, function (err, address)
	{
		if (err)
		{
			fastify.log.error(err)
			process.exit(1)
		}	
		fastify.log.info(`server listening on ${address}`)
	}
)
