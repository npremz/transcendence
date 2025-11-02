import Fastify from 'fastify'
import { testMiddleware } from './shared/middleware/test' //dev

const fastify = Fastify({
	logger: true
})

//test middleware //dev
fastify.addHook('onRequest', testMiddleware('userback'))


fastify.get('/', function (request, reply)
	{
		reply.send({ hello: 'world' })
	}
)

fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'chat-backend' };
});

fastify.listen({ port: 3060, host: '0.0.0.0'}, function (err, address)
	{
		if (err)
		{
			fastify.log.error(err)
			process.exit(1)
		}	
		fastify.log.info(`server listening on ${address}`)
	}
)
