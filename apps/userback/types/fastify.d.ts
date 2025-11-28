import 'fastify';
import type sqlite3 from 'sqlite3';
import type { TokenPayload } from '../utils/jwt';

declare module 'fastify' {
	interface FastifyInstance {
		db: sqlite3.Database;
	}

	interface FastifyRequest {
		user?: TokenPayload;
	}
}

declare module '@fastify/jwt' {
	interface FastifyJWT {
		payload: TokenPayload;
		user: TokenPayload;
	}
}
