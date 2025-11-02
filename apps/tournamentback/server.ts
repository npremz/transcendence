import Fastify from 'fastify'
import { TournamentManager } from './TournamentManager'
import type { Player } from './types'
import { testMiddleware } from './shared/middleware/test' //dev

const fastify = Fastify({
	logger: true
})

const tournamentManager = new TournamentManager()


const initServer = async () => {
	await tournamentManager.initTournaments()
	
	//test middleware //dev
	fastify.addHook('onRequest', testMiddleware('tournamentback'))
	
    // fastify.addHook('onRequest', async (request, reply) => {
    //     console.log('=== REQUÊTE REÇUE ===')
    //     console.log('URL:', request.url)
    //     console.log('Method:', request.method)
    //     console.log('Headers:', JSON.stringify(request.headers, null, 2))
    //     console.log('====================')
    // })

    fastify.post('/match-finished', async (request, reply) => {
        const { matchId, winnerId } = request.body as { 
            matchId: string; 
            winnerId: string;
        };

        if (!matchId || !winnerId)
        {
            return reply.status(400).send({ 
                success: false, 
                error: 'matchId and winnerId are required' 
            });
        }

        console.log(`Match ${matchId} finished, winner: ${winnerId}`);

        tournamentManager.onMatchFinished(matchId, winnerId);

        return { success: true };
    });

    fastify.get('/tournaments', async (request, reply) => {
        const registrations = tournamentManager.getCurrentRegistrations()
        return { success: true, registrations }
    })

    fastify.post('/tournaments/:tournamentId/join', async (request, reply) => {
        const { tournamentId } = request.params as { tournamentId: string }
        const { username, playerId } = request.body as { username: string; playerId: string }

        if (!username || !playerId)
        {
            return reply.status(400).send({ 
                success: false, 
                error: 'Username and playerId are required' 
            })
        }

        const newPlayer: Player = {
            id: playerId,
            username,
            currentTournament: tournamentId,
            isEleminated: false,
        }

        const success = tournamentManager.registerPlayer(tournamentId, newPlayer)
        
        if (!success)
        {
            return reply.status(400).send({ 
                success: false, 
                error: 'Cannot join tournament: tournament full or unavailable' 
            })
        }

        const tournament = tournamentManager.getTournamentDetails(tournamentId)
        if (tournament?.status === 'in_progress')
        {
            return { 
                success: true, 
                tournamentStarted: true,
                tournamentId: tournament.id,
                message: 'Tournament is starting!' 
            }
        }

        return { 
            success: true, 
            tournamentStarted: false,
            currentPlayers: tournament?.currentPlayers.length || 0,
            maxPlayers: tournament?.maxPlayers || 0
        }
    })

    fastify.delete('/tournaments/leave/:playerId', async (request, reply) => {
        const { playerId } = request.params as { playerId: string }
        
        const removed = tournamentManager.removePlayerFromAllRegistrations(playerId)
        
        return { success: removed }
    })

    fastify.get('/tournaments/:id', async (request, reply) => {
        const { id } = request.params as { id: string }
        
        const tournament = tournamentManager.getTournamentDetails(id)
        
        if (!tournament)
        {
            return reply.status(404).send({ error: 'Tournament not found' })
        }
        
        return { success: true, tournament }
    })

    fastify.get('/tournaments/:id/brackets', async (request, reply) => {
        const { id } = request.params as { id: string }
        
        const brackets = tournamentManager.getTournamentBrackets(id)
        
        if (!brackets)
        {
            return reply.status(404).send({ error: 'Tournament not found' })
        }
        
        return { success: true, tournamentId: id, brackets }
    })


    fastify.get('/', function (request, reply)
        {
            reply.send({ hello: 'world' })
        }
    )

    fastify.get('/health', async (request, reply) => {
        return { status: 'ok', service: 'tournament-backend' }
    })

    fastify.listen({ port: 3040, host: '0.0.0.0'}, function (err, address)
        {
            if (err)
            {
                fastify.log.error(err)
                process.exit(1)
            }	
            fastify.log.info(`server listening on ${address}`)
        }
    )
}

initServer();
