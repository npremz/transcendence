import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateSession } from '../sessionManager';

// Étendre les types Fastify pour inclure les infos de session
declare module 'fastify' {
	interface FastifyRequest {
		session?: {
			sessionId: string;
			userId: string;
			username: string;
		};
	}
}

/**
 * Middleware pour vérifier qu'une session valide existe
 * Lit le cookie player_session et valide contre la DB
 */
export async function requireSession(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	const sessionId = request.cookies.player_session;

	if (!sessionId) {
		reply.status(401).send({
			success: false,
			error: 'No session cookie found',
			code: 'SESSION_MISSING'
		});
		return;
	}

	const result = await validateSession(request.server.db, sessionId);

	if (!result.valid || !result.user) {
		reply.status(401).send({
			success: false,
			error: 'Invalid or expired session',
			code: 'SESSION_INVALID'
		});
		return;
	}

	// Attacher les infos de session à la requête pour utilisation ultérieure
	request.session = {
		sessionId: sessionId,
		userId: result.user.id,
		username: result.user.username
	};
}

/**
 * Middleware optionnel : récupère la session si elle existe, mais ne bloque pas
 */
export async function optionalSession(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	const sessionId = request.cookies.player_session;

	if (!sessionId) {
		return;
	}

	const result = await validateSession(request.server.db, sessionId);

	if (result.valid && result.user) {
		request.session = {
			sessionId: sessionId,
			userId: result.user.id,
			username: result.user.username
		};
	}
}
