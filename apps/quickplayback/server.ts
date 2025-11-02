import Fastify from 'fastify'
import { handleQuickPlay } from './quickplay'
import { handleTournamentQuickPlay } from './TounamentQuickPlay'
import { RoomManager } from './RoomManager'
import { testMiddleware } from './shared/middleware/test' //dev

const fastify = Fastify({
	logger: true
})

export const roomManager = new RoomManager()

//test middleware //dev
fastify.addHook('onRequest', testMiddleware('quickplayback'))

fastify.addHook('onRequest', async (request, reply) => {
    console.log('=== REQUÊTE REÇUE ===')
    console.log('URL:', request.url)
    console.log('Method:', request.method)
    console.log('Headers:', JSON.stringify(request.headers, null, 2))
    console.log('====================')
})


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
