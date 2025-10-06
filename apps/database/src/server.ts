import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import database from './database/connection'

const fastify: FastifyInstance = Fastify({
	logger: true
})

fastify.register(cors, {
	origin: true,
	credentials: true
})

declare module 'fastify'
{
	interface FastifyInstance
	{
		db: import('sqlite3').Database
	}
}

fastify.get('/health', async (request, reply) => {
	return {
		status: 'ok',
		timestamp: new Date().toISOString(),
		service: 'database'
	}
})

fastify.setErrorHandler((error, request, reply) => {
	fastify.log.error(error)
	reply.status(500).send({
		success: false,
		error: 'Internal server error'
	})
})

const start = async (): Promise<void> => {
	try
	{
		await database.connect()
		await database.init()

		// Adding db to fastify instance
		fastify.decorate('db', database.getDb())

		await fastify.listen({
			port: 3020,
			host: '0.0.0.0'
		})
		console.log('Database API service running on port 3020')
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}

process.on('SIGINT', async () => {
	console.log('Shutting down database API service...')
	await fastify.close()
	process.exit()
})

start()
