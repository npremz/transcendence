import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { LoginRequest, RegisterRequest, UserPayload } from './types';
import { testMiddleware } from './shared/middleware/test'; //dev

const app = Fastify({
	logger: true
});

// Register plugins
app.register(fastifyCookie, {
	secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })()
});

app.register(fastifyJwt, {
	secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })()
});

//test middleware //dev
app.addHook('onRequest', testMiddleware('authback'));

// WIP - Temporary storage and id
const users: Array<{ id: number; username: string; password: string; email?: string }> = [];
let userIdCounter = 1;

// WIP - find user will have to be related to the db
const findUser = (username: string) => users.find(u => u.username === username);

// Register
app.post('/register', async (request, reply) => {
	try {
		const { username, password, email } = request.body as RegisterRequest; // TODO: secure by checking schema

		if (!username || !password) {
			return reply.status(400).send({error: 'Username and password are required'});
		}
		if (findUser(username)) {
			return reply.status(409).send({ error: 'Username already exists'});
		}

		const newUser = {
			id: userIdCounter++,
			username,
			password, // TODO: Hash the password
			email
		};
		users.push(newUser);

		// create jwt
		const token = (app as any).jwt.sign({ // TODO: check the different type of encoding
			username: newUser.username, 
			userId: newUser.id
		});

		return reply.send({ 
			success: true,
			token,
			user: { 
				id: newUser.id, 
				username: newUser.username,
				email: newUser.email 
			} 
		});
	} catch (error) {
		app.log.error(error);
		// TODO: handle specific errors like 400 when body is malformed, 503 when db is down, etc
		return reply.status(500).send({error: 'Internal server error'});
	}
});

// Login
app.post('/login', async (request, reply) => {
	try {
		const { username, password } = request.body as LoginRequest; // TODO: secure by checking schema

		if (!username || !password) {
			return reply.status(400).send({error: 'Username and password are required'});
		}

		const user = findUser(username);
		if (!user || user.password !== password) { // WIP - compare hashed passwords
			return reply.status(401).send({error: 'Invalid credentials'});
		}

		// create jwt
		const token = (app as any).jwt.sign({ 
			username: user.username, 
			userId: user.id 
		});

		return reply.send({ 
			success: true,
			token,
			user: { 
				id: user.id, 
				username: user.username,
				email: user.email 
			} 
		});
	} catch (error) {
		app.log.error(error);
		return reply.status(500).send({error: 'Internal server error'});
	}
});

// Verify/validate token
app.get('/verify', async (request, reply) => {
	try {
		await (request as any).jwtVerify();
		const payload = (request as any).user as UserPayload;
		
		return reply.send({ 
			valid: true,
			user: {
				username: payload.username
			}
		});
	} catch (error) {
		return reply.status(401).send({valid: false, error: 'Invalid or expired token'});
	}
});

// Health check
app.get('/health', async (request, reply) => {
	return reply.send({status: 'ok', service: 'auth-server'});
});

// Start server
const start = async () => {
	try {
		const port = parseInt(process.env.AUTH_PORT || (() => { throw new Error('AUTH_PORT environment variable is required'); })());
		const host = process.env.AUTH_VALID_HOST || (() => { throw new Error('AUTH_VALID_HOST environment variable is required'); })();

		await app.listen({ port, host });
		app.log.info(`OK: Auth server listening on ${host}:${port}`);
	} catch (err) {
		app.log.error(`ERROR: ${err}`);
		process.exit(1);
	}
};

start();
