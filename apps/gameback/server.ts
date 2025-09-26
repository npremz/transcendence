import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { handleGame } from './game/game'
import { setMatchForRoom } from './game/session/session'

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

fastify.get('/game/:roomId', { websocket: true }, function gameHandler (connection, _req)
	{
		handleGame(connection, _req, fastify)
	}
)

type CreateBody = {
    roomId: string;
    player1: {id: string; username: string};
    player2: {id: string; username: string};
}

fastify.post('/create', async (request, reply) => {

    console.log('Body:', JSON.stringify(request.body, null, 2));
	const body = request.body as Partial<CreateBody>;
    if (!body?.roomId || !body?.player1?.id || !body?.player2?.id)
    {
        reply.code(400).send({success: false, error: 'Invalid payload'});
        return;
    }
    setMatchForRoom(body.roomId, {
        left: {id: body.player1.id, username: body.player1.username || 'p1'},
        right: {id: body.player2.id, username: body.player2.username || 'p2'}
    }, fastify.log);

    reply.send({success: true});
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
