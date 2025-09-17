import type { WebSocket, WebsocketHandler } from "@fastify/websocket";
import type { FastifyBaseLogger } from "fastify";
import { GameWorld } from "../engine/world";
import { SERVER_DT, SERVER_TICK_HZ, BROADCAST_HZ } from "../engine/constants";
import type { ClientMessage, ServerMessage } from "../ws/messageTypes";
import { safeParse } from "../ws/messageTypes";

type Role = 'left' | 'right';

class GameSession {
	private log?: FastifyBaseLogger;
	private world = new GameWorld();

	private clients = new Set<WebSocket>();
	private roles = new Map<WebSocket, Role>();
	private leftCtrl?: WebSocket;
	private rightCtrl?: WebSocket;

	private tickTimer?: NodeJS.Timeout;
	private broadcastTimer?: NodeJS.Timeout;

	constructor(log?: FastifyBaseLogger) {
		this.startLoops();
		this.log = log;
	}

	addClient(ws: WebSocket) {
		const role = this.assignRole(ws);
		this.clients.add(ws);
		this.roles.set(ws, role);
		this.send(ws, {type: 'welcome', side: role});
		this.log?.info({ role, clients: this.clients.size }, 'client connected');

		ws.on('message', (raw: Buffer) => this.onMessage(ws, raw));
		ws.on('close', () => this.onClose(ws));
		ws.on('error', () => this.onClose(ws));

		this.log?.info({role}, 'client connected');
		if (this.leftCtrl && this.rightCtrl)
		{
			this.world.startCountdown();
		}
		if (this.leftCtrl && this.rightCtrl && this.world.state.isGameOver)
		{
			this.world.restart();
		}
	}

	private assignRole(ws: WebSocket): Role {
		if (!this.leftCtrl)
		{
			this.leftCtrl = ws; 
			return ('left');
		}
		this.rightCtrl = ws;
		return ('right');
	}

	private onMessage(ws: WebSocket, raw: Buffer) {
		const msg = safeParse<ClientMessage>(raw.toString());
		if (!msg)
		{
			console.log('No msg');
			return;
		}
		this.log?.info({ role: this.roles.get(ws), bytes: raw.byteLength }, 'ws <- message');
		this.log?.info(msg.type);
		switch (msg.type) {
			case 'input': {
				const role = this.roles.get(ws);
				if (role === 'left' || role === 'right')
				{
					const intention = msg.up && !msg.down ? -1 : msg.down && !msg.up ? 1 : 0;
					this.world.applyInput(role, intention);
				}
				break;
			}
			case 'pause':
				this.world.pause();
				this.broadcast({type: 'paused'});
				break;
			case 'resume':
				this.world.resume();
				break;
			case 'ping':
				this.send(ws, {type: 'pong', t: msg.t});
				break;
		}
	}

	private onClose(ws: WebSocket) {
		this.clients.delete(ws);
		const role = this.roles.get(ws);
		this.roles.delete(ws);
		if (this.leftCtrl === ws)
		{
			this.leftCtrl = undefined;
		}
		if (this.rightCtrl === ws)
		{
			this.rightCtrl = undefined;
		}
		this.log?.info({role}, 'client disconnected');
	}

	private startLoops() {
		this.tickTimer = setInterval(() => {
			this.world.update(SERVER_DT);
		}, Math.round(1000 / SERVER_TICK_HZ));

		this.broadcastTimer = setInterval(() => {
			const state = this.world.publicState();
			this.broadcast({type: 'state', state, serverTime: Date.now()});
			if (state.countdownValue > 0)
			{
				this.broadcast({type: 'countdown', value: state.countdownValue});
			}
			if (state.isGameOver)
			{
				this.broadcast({type: 'gameover', winner: state.winner || 'left'});
			}
		}, Math.round(1000 / BROADCAST_HZ));
	}

	private send(ws: WebSocket | undefined, msg: ServerMessage) {
		if (!ws || ws.readyState !== ws.OPEN)
		{
			return;
		}
		ws.send(JSON.stringify(msg));
	}

	private broadcast(msg: ServerMessage) {
		for (const c of this.clients)
		{
			this.send(c, msg);
		}
	}
}

let singleton: GameSession | null = null;
export const getSession = (log?: FastifyBaseLogger) => {
	if (!singleton)
	{
		singleton = new GameSession(log);
	}
	return (singleton);
};