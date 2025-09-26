import type { WebSocket, WebsocketHandler } from "@fastify/websocket";
import type { FastifyBaseLogger } from "fastify";
import { GameWorld } from "../engine/world";
import { SERVER_DT, SERVER_TICK_HZ, BROADCAST_HZ } from "../engine/constants";
import type { ClientMessage, ServerMessage } from "../ws/messageTypes";
import { safeParse } from "../ws/messageTypes";

type Role = 'left' | 'right' | 'spectator';
type Player = {id: string; username: string};

class GameSession {
	private log?: FastifyBaseLogger;
	private world = new GameWorld();

	private clients = new Set<WebSocket>();
	private roles = new Map<WebSocket, Role>();
	private leftCtrl?: WebSocket;
	private rightCtrl?: WebSocket;
    
    private expected: {left?: Player; right?: Player} = {};

	private tickTimer?: NodeJS.Timeout;
	private broadcastTimer?: NodeJS.Timeout;

	constructor(private readonly roomId?: string, log?: FastifyBaseLogger) {
		this.startLoops();
		this.log = log;
	}

    setPlayers(players: {left: Player; right: Player}) {
        this.expected.left = players.left;
        this.expected.right = players.right;
        this.log?.info({roomId: this.roomId, players: this.expected}, 'match set');
    }

	addClient(ws: WebSocket, info?: {id?: string; username?: string}) {
		const role = this.assignRole(ws, info?.id);
		this.clients.add(ws);
		this.roles.set(ws, role);
		this.send(ws, {type: 'welcome', side: role});
		this.log?.info({ roomId: this.roomId, role, clients: this.clients.size, playerId: info?.id }, 'client connected');

		ws.on('message', (raw: Buffer) => this.onMessage(ws, raw));
		ws.on('close', () => this.onClose(ws));
		ws.on('error', () => this.onClose(ws));

		if (this.leftCtrl && this.rightCtrl)
		{
			if (this.world.state.isGameOver)
            {
                this.world.restart();
            }
            else
            {
                this.world.startCountdown();
            }
		}
	}

	private assignRole(ws: WebSocket, playerId?: string): Role {
		if (this.expected.left?.id || this.expected.right?.id) 
        {
            if (playerId && this.expected.left?.id === playerId && !this.leftCtrl)
            {
                this.leftCtrl = ws;
                return ('left');
            }
            if (playerId && this.expected.right?.id === playerId && !this.rightCtrl)
            {
                this.rightCtrl = ws;
                return ('right');
            }
            return ('spectator');
        }
        if (!this.leftCtrl)
        {
            this.leftCtrl = ws;
            return ('left');
        }
        if (!this.rightCtrl)
        {
            this.rightCtrl = ws;
            return ('right');
        }
        return ('spectator');
	}

	private onMessage(ws: WebSocket, raw: Buffer) {
		const msg = safeParse<ClientMessage>(raw.toString());
		if (!msg)
		{
			return;
		}
        const role = this.roles.get(ws);
		switch (msg.type) {
			case 'input': {
				if (role === 'left' && ws === this.leftCtrl)
				{
					const intention = msg.up && !msg.down ? -1 : msg.down && !msg.up ? 1 : 0;
                    this.world.applyInput('left', intention);
				}
				else if (role === 'right' && ws === this.rightCtrl)
                {
                    const intention = msg.up && !msg.down ? -1 : msg.down && !msg.up ? 1 : 0;
                    this.world.applyInput('right', intention)
                }
                break;
			}
			case 'smash': {
				const role = this.roles.get(ws);
				if (role === 'left' || role === 'right')
				{
					this.world.pressSmash(role);
				}
				break;
			}
			case 'pause':
				this.world.pause();
				this.broadcast({type: 'paused'});
				break;
			case 'resume': {
				if (this.world.state.isGameOver)
				{
					if (this.leftCtrl && this.rightCtrl)
					{
						this.world.restart();
						this.broadcast({type: 'resumed'});
					}
					else
					{
						this.send(ws, {type: 'error', message: 'Two players required'});
						this.world.restart();
					}
				}
				else
				{
					this.world.resume();
					this.broadcast({type: 'resumed'});
				}
				break;
			}
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
		this.log?.info({roomId: this.roomId, role}, 'client disconnected');
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
		if (!ws || ws.readyState !== 1)
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

const rooms = new Map<string, GameSession>();

export const getSessionForRoom = (roomId: string, log?: FastifyBaseLogger) => {
    if (!rooms.has(roomId))
    {
        rooms.set(roomId, new GameSession(roomId, log));
    }
    return (rooms.get(roomId)!);
}

export const setMatchForRoom = (roomId: string, players: {left: Player; right: Player}, log?: FastifyBaseLogger) => {
    const session = getSessionForRoom(roomId, log);
    session.setPlayers(players);
    return session;
}

let singleton: GameSession | null = null;
export const getSession = (log?: FastifyBaseLogger) => {
	if (!singleton)
	{
		singleton = new GameSession(log);
	}
	return (singleton);
};