import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import { LoginRequest, RegisterRequest, UserPayload } from './types';

// JWT Checker function to be used as a preHandler in routes that require authentication

export const jwtChecker = async (request: FastifyRequest, reply: FastifyReply) => {
	try {
		await request.jwtVerify<UserPayload>()
	} catch (err) {
		return reply.status(401).send({valid: false, error: 'Invalid or expired token'})
	}
}
