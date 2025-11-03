import Fastify from 'fastify'
import websocket from '@fastify/websocket'

const fastify = Fastify({
	logger: true
})

await fastify.register(websocket)

fastify.addHook('onRequest', async (request, reply) => {
	console.log('###########################################')
	console.log('GAME 3D connected')
	console.log('###########################################')
})

fastify.get('/', function (request, reply)
	{
		reply.send({ hello: 'globe' })
	}
)

fastify.get('/health', async (request, reply) => {
	return { status: 'ok', service: 'game3d-backend' };
});

fastify.listen({ port: 3050, host: '0.0.0.0'}, function (err, address)
	{
		if (err)
		{
			fastify.log.error(err)
			process.exit(1)
		}	
		fastify.log.info(`server listening on ${address}`)
	}
)
