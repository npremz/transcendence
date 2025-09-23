import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { handleGame } from './game/game'

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

fastify.get('/game', { websocket: true }, function gameHandler (socket, req)
	{
		handleGame(socket, req, fastify)
	}
)

fastify.post('/create', async (request, reply) => {
	reply.send({success:true});
	console.log(request.body.roomId);
})

fastify.get('/', function (request, reply)
	{
		reply.send({ hello: 'world' })
	}
)

fastify.listen({ port: 3010, host: '0.0.0.0'}, function (err, address)
	{
		if (err)
		{
			fastify.log.error(err)
			process.exit(1)
		}	
		fastify.log.info(`server listening on ${address}`)
	}
)
