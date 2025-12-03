import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { handleGame } from './game/game'
import { setMatchForRoom } from './game/session/session'
import { cleanupSession } from './game/session/session'

const fastify = Fastify({
	logger: true
})

await fastify.register(websocket)

fastify.get('/game/:roomId', { websocket: true }, function gameHandler (connection, _req)
	{
		handleGame(connection, _req, fastify)
	}
)

fastify.delete('/game/:roomId', async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    const deleted = cleanupSession(roomId);
    return reply.send({ success: deleted });
});

type CreateBody = {
    roomId: string;
    player1: {id: string; username: string; avatar?: string; selectedSkill?: 'smash' | 'dash'};
    player2: {id: string; username: string; avatar?: string; selectedSkill?: 'smash' | 'dash'};
	isTournament?: boolean;
    tournamentId?: string;
    matchId?: string;
	classicMode?: boolean;
}

fastify.post('/create', async (request, reply) => {

    console.log('Body:', JSON.stringify(request.body, null, 2));
	const body = request.body as Partial<CreateBody>;
    if (!body?.roomId || !body?.player1?.id || !body?.player2?.id)
    {
        reply.code(400).send({success: false, error: 'Invalid payload'});
        return;
    }
    setMatchForRoom(
		body.roomId,
		{
			left: {
				id: body.player1.id,
				username: body.player1.username || 'p1',
				avatar: body.player1.avatar,
				selectedSkill: body.player1.selectedSkill || 'smash'
			},
			right: {
				id: body.player2.id,
				username: body.player2.username || 'p2',
				avatar: body.player2.avatar,
				selectedSkill: body.player2.selectedSkill || 'smash'
			}
		},
		{
			isTournament: body.isTournament,
			tournamentId: body.tournamentId,
			matchId: body.matchId,
			classicMode: body.classicMode
		},
		fastify.log
	);

    reply.send({success: true});
})

fastify.get('/', function (request, reply)
	{
		reply.send({ hello: 'world' })
	}
)

fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'game-backend' };
});

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
