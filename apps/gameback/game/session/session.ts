import type { WebSocket, WebsocketHandler } from "@fastify/websocket";
import type { FastifyBaseLogger } from "fastify";
import { GameWorld } from "../engine/world";
import { SERVER_DT, SERVER_TICK_HZ, BROADCAST_HZ, TIMEOUT_MS } from "../engine/constants";
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

	private leftCtrlDisconnectedAt: number | null = null;
	private rightCtrlDisconnectedAt: number | null = null;
	private hadBothCtrl = false;

	private reportedGameOver = false;

	private lastPaused = false;
	private lastGameOver = false;

	private emptySince: number | null = null;

	constructor(private readonly roomId?: string, log?: FastifyBaseLogger) {
		this.startLoops();
		this.log = log;
	}

	private destroy() {
		if (this.tickTimer)
		{
			clearInterval(this.tickTimer);
		}
		if (this.broadcastTimer)
		{
			clearInterval(this.broadcastTimer);
		}
		this.clients.clear();
		this.roles.clear();
		this.leftCtrl = undefined;
		this.rightCtrl = undefined;
	}

    setPlayers(players: {left: Player; right: Player}) {
        this.expected.left = players.left;
        this.expected.right = players.right;
        this.log?.info({roomId: this.roomId, players: this.expected}, 'match set');
    }

	addClient(ws: WebSocket) {
		ws.on('message', (raw: Buffer) => this.onMessage(ws, raw));
		ws.on('close', () => this.onClose(ws));
		ws.on('error', () => this.onClose(ws));
	}

	private assignRole(ws: WebSocket, playerId?: string): Role {
		if (this.expected.left?.id || this.expected.right?.id) 
        {
            if (playerId && this.expected.left?.id === playerId && !this.leftCtrl)
            {
                this.leftCtrl = ws;
                this.leftCtrlDisconnectedAt = null;
                return ('left');
            }
            if (playerId && this.expected.right?.id === playerId && !this.rightCtrl)
            {
                this.rightCtrl = ws;
                this.rightCtrlDisconnectedAt = null;
                return ('right');
            }
            return ('spectator');
        }
        // if (!this.leftCtrl)
        // {
        //     this.leftCtrl = ws;
        //     this.leftCtrlDisconnectedAt = null;
        //     return ('left');
        // }
        // if (!this.rightCtrl)
        // {
        //     this.rightCtrl = ws;
        //     this.rightCtrlDisconnectedAt = null;
        //     return ('right');
        // }
        return ('spectator');
	}

	private onMessage(ws: WebSocket, raw: Buffer) {
		const msg = safeParse<ClientMessage>(raw.toString());
		if (!msg)
		{
			return;
		}
        const role = this.roles.get(ws);
		const canCtrl = (role === 'left' && ws === this.leftCtrl) ||
						(role === 'right' && ws === this.rightCtrl);
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
				if (role === 'left' || role === 'right')
				{
					this.world.pressSmash(role);
				}
				break;
			}
			case 'pause':
				if (!canCtrl)
				{
					this.send(ws, {type: 'error', message: 'Spectators can\'t pause the game'});
					break;
				}
				this.world.pause();
				break;
			case 'resume': {
				if (!canCtrl)
				{
					this.send(ws, {type: 'error', message: 'Spectators can\'t resume the game'});
					break;
				}
				if (this.world.state.isGameOver)
				{
					if (this.leftCtrl && this.rightCtrl)
					{
						this.world.restart();
						this.lastGameOver = false;
						this.broadcast({type: 'resumed'});
					}
					else
					{
						this.send(ws, {type: 'error', message: 'Two players required'});
					}
				}
				else
				{
					this.world.resume();
				}
				break;
			}
			case 'logIn':
				const assRole = this.assignRole(ws, msg.id);
				this.clients.add(ws);
				this.roles.set(ws, assRole);
				this.send(ws, {type: 'welcome', side: assRole});
				this.log?.info({ roomId: this.roomId, assRole, clients: this.clients.size, playerId: msg.id }, 'client connected');
				const haveBoth = !!this.leftCtrl && !!this.rightCtrl;
				if (haveBoth && !this.hadBothCtrl)
				{
					if (this.world.state.isGameOver)
					{
						this.world.restart();
						this.lastGameOver = false;
					}
					else
					{
						this.world.startCountdown();
					}
				}
				this.hadBothCtrl = haveBoth;
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
            this.leftCtrlDisconnectedAt = Date.now();
            this.log?.info({roomId: this.roomId, role}, 'client disconnected starting 30s timeout');
		}
		if (this.rightCtrl === ws)
		{
			this.rightCtrl = undefined;
            this.rightCtrlDisconnectedAt = Date.now();
            this.log?.info({roomId: this.roomId, role}, 'client disconnected starting 30s timeout');
		}
        if (!this.leftCtrl && !this.rightCtrl)
        {
            this.log?.info({roomId: this.roomId, role}, 'Both client disconnected');
        }
		this.log?.info({roomId: this.roomId, role}, 'client disconnected');
		if (this.clients.size === 0 && this.emptySince === null)
		{
			this.emptySince = Date.now();
		}
		this.hadBothCtrl = !!this.leftCtrl && !!this.rightCtrl;
	}

	private async notifyGameEnd(reason: 'score' | 'timeout', winner?: 'left' | 'right'): Promise<void> {
        if (this.reportedGameOver)
		{
            return;
        }
        this.reportedGameOver = true;

        const host = process.env.VITE_HOST || 'localhost:8443';
        const endpoint = '/quickplay/room-finished';
        const url = `https://${host}${endpoint}`;

        try {
            const payload = {
                roomId: this.roomId,
                reason: reason,
                winner: winner ? {
                    id: winner === 'left' ? this.expected.left?.id : this.expected.right?.id,
                    username: winner === 'left' ? this.expected.left?.username : this.expected.right?.username
                } : null,
                score: this.world.state.score
            };

            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            this.log?.info({ roomId: this.roomId, reason }, 'Game end notified to quickplay');
        } catch (err) {
            this.log?.error({ roomId: this.roomId, error: err }, 'Failed to notify game end');
        }
    }

	private startLoops() {
		this.tickTimer = setInterval(() => {
			this.world.update(SERVER_DT);
		}, Math.round(1000 / SERVER_TICK_HZ));

		this.broadcastTimer = setInterval(() => {
            const now = Date.now();
            const leftDisconnected = this.leftCtrlDisconnectedAt !== null && !this.leftCtrl;
            const rightDisconnected = this.rightCtrlDisconnectedAt !== null && !this.rightCtrl;
            const bothDisconnected = !this.leftCtrl && !this.rightCtrl;

            if ((leftDisconnected || rightDisconnected) && !this.world.state.isGameOver)
            {
                this.world.pause();
            }
            let leftRemaining = 0;
            let rightRemaining = 0;

            if (leftDisconnected && this.leftCtrlDisconnectedAt)
            {
                const elapsed = now - this.leftCtrlDisconnectedAt;
                leftRemaining = Math.max(0, TIMEOUT_MS - elapsed);
                if (leftRemaining === 0 && !this.world.state.isGameOver)
                {
                    this.world.state.isGameOver = true;
                    this.world.state.winner = 'right';
                    this.world.state.isTimeoutLeft = true;
					this.notifyGameEnd('timeout', 'right');
                }
            }

            if (rightDisconnected && this.rightCtrlDisconnectedAt)
            {
                const elapsed = now - this.rightCtrlDisconnectedAt;
                rightRemaining = Math.max(0, TIMEOUT_MS - elapsed);
                if (rightRemaining === 0 && !this.world.state.isGameOver)
                {
                    this.world.state.isGameOver = true;
                    this.world.state.winner = 'left';
                    this.world.state.isTimeoutRight = true;
					this.notifyGameEnd('timeout', 'left');
                }
            }

            if ((leftDisconnected || rightDisconnected) && !this.world.state.isGameOver)
            {
                this.broadcast({
                    type: 'timeout_status',
                    left: {
                        active: leftDisconnected,
                        remainingMs: leftRemaining
                    },
                    right: {
                        active: rightDisconnected,
                        remainingMs: rightRemaining
                    }
                });
            }
			const state = this.world.publicState();
			this.broadcast({type: 'state', state, serverTime: Date.now()});
			if (state.countdownValue > 0)
			{
				this.broadcast({type: 'countdown', value: state.countdownValue});
			}
			const pausedNow = state.isPaused;
			if (pausedNow !== this.lastPaused)
			{
				this.broadcast({type: pausedNow ? 'paused' : 'resumed'});
				this.lastPaused = pausedNow
			}
			if (state.isGameOver && !this.lastGameOver)
			{
				this.lastGameOver = true;
				this.broadcast({type: 'gameover', winner: state.winner || 'left'});
				this.notifyGameEnd('score', state.winner as 'left' | 'right');
			}
			if (this.clients.size === 0)
			{
				if (this.emptySince && (Date.now() - this.emptySince > 5 * 60_000))
				{
					rooms.delete(this.roomId || '');
					this.destroy();
					return;
				}
			else
			{
				this.emptySince = null;
			}
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

	cleanup(): void
	{
        if (this.tickTimer)
		{
            clearInterval(this.tickTimer);
            this.tickTimer = undefined;
        }
        if (this.broadcastTimer)
		{
            clearInterval(this.broadcastTimer);
            this.broadcastTimer = undefined;
        }
        this.clients.clear();
        this.roles.clear();
        this.log?.info({ roomId: this.roomId }, 'GameSession cleaned up');
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

export const cleanupSession = (roomId: string): boolean => {
    const session = rooms.get(roomId);
    if (session) {
        session.cleanup();
        rooms.delete(roomId);
        return true;
    }
    return false;
};
