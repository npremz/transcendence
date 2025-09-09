import Fastify from 'fastify'
import websocket from '@fastify/websocket'

const fastify = Fastify({
	logger: true
})

await fastify.register(websocket)

fastify.addHook('onRequest', async (request, reply) => {
    console.log('=== REQUÊTE REÇUE ===')
    console.log('URL:', request.url)
    console.log('Method:', request.method)
    console.log('Headers:', JSON.stringify(request.headers, null, 2))
    console.log('====================')
})

fastify.get('/ws', { websocket: true }, function wsHandler (socket, req)
	{
		fastify.log.info(`New Client: ${req.id}`)
		socket.on('message', message =>
			{
				//message.toString() === 'hi from client'
				fastify.log.info(`message client: ${message}`)
				socket.send('hi from server')
			}
		)
	}
)

fastify.get('/', function (request, reply)
	{
		reply.send({ hello: 'world' })
	}
)

fastify.listen({ port: 3000, host: '0.0.0.0'}, function (err, address)
	{
		if (err)
		{
			fastify.log.error(err)
			process.exit(1)
		}	
		fastify.log.info(`server listening on ${address}`)
	}
)
