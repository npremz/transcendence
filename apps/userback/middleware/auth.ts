import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { isTokenBlacklisted } from '../utils/jwt';

/**
 * Middleware pour vérifier l'authentification JWT
 * Vérifie le token et le charge dans request.user
 */
export async function authenticateJWT(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	try {
		// Vérifie et décode le JWT (via @fastify/jwt)
		await request.jwtVerify();

		// Vérifie si le token est blacklisté
		const jti = request.user?.jti;
		if (!jti) {
			return reply.status(401).send({
				success: false,
				error: 'Invalid token: missing jti'
			});
		}

		const blacklisted = await isTokenBlacklisted(request.server.db, jti);
		if (blacklisted) {
			return reply.status(401).send({
				success: false,
				error: 'Token has been revoked'
			});
		}
	} catch (err) {
		return reply.status(401).send({
			success: false,
			error: 'Invalid or expired token'
		});
	}
}

/**
 * Middleware optionnel pour vérifier l'authentification
 * Ne bloque pas si le token est absent, mais le valide s'il est présent
 */
export async function optionalAuth(
	request: FastifyRequest,
	reply: FastifyReply,
	done: HookHandlerDoneFunction
): Promise<void> {
	try {
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			await request.jwtVerify();
			
			const jti = request.user?.jti;
			if (jti) {
				const blacklisted = await isTokenBlacklisted(request.server.db, jti);
				if (blacklisted) {
					request.user = undefined;
				}
			}
		}
	} catch (err) {
		// Token invalide, on continue sans user
		request.user = undefined;
	}
	done();
}

/**
 * Middleware pour vérifier que l'utilisateur accède à ses propres ressources
 */
export function requireSelfOrAdmin(userIdParam: string = 'userId') {
	return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
		const requestedUserId = (request.params as any)[userIdParam];
		const currentUserId = request.user?.userId;

		if (!currentUserId) {
			return reply.status(401).send({
				success: false,
				error: 'Authentication required'
			});
		}

		// TODO: Ajouter vérification du rôle admin si nécessaire
		if (requestedUserId !== currentUserId) {
			return reply.status(403).send({
				success: false,
				error: 'Access denied: you can only access your own resources'
			});
		}
	};
}

/**
 * Middleware pour extraire les informations de la requête (user agent, IP)
 */
export function extractRequestInfo(request: FastifyRequest): {
	userAgent?: string;
	ipAddress?: string;
} {
	return {
		userAgent: request.headers['user-agent'],
		ipAddress: request.ip || request.socket.remoteAddress
	};
}
