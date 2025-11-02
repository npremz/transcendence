import { FastifyRequest, FastifyReply } from 'fastify';

// export async function testMiddleware(request: FastifyRequest, reply: FastifyReply) {
// 	console.log(`MIDDLEWARE (${serviceName}) EXECUTED!`);
// 	console.log('URL:', request.url);
// 	console.log('Method:', request.method);
// 	console.log('Time:', new Date().toISOString());
// 	console.log('');
// } //dev

export function testMiddleware (serviceName: string) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		console.log(`MIDDLEWARE (${serviceName}) EXECUTED!`);
		console.log('URL:', request.url);
		console.log('Method:', request.method);
		console.log('Time:', new Date().toISOString());
		console.log('');
	}
} //dev
