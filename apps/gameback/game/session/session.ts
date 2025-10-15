import type { WebSocket, WebsocketHandler } from "@fastify/websocket";
import type { FastifyBaseLogger } from "fastify";
import { GameWorld } from "../engine/world";
import { SERVER_DT, SERVER_TICK_HZ, BROADCAST_HZ, TIMEOUT_MS } from "../engine/constants";
import type { ClientMessage, ServerMessage } from "../ws/messageTypes";
import { safeParse } from "../ws/messageTypes";

type Role = 'left' | 'right' | 'spectator';
type Player = {id: string; username: string};

interface GameStats {
	paddle_hits: number;
	max_ball_speed: number;
	power_ups_collected: number;
	skills_used: number;
	smashes: Array<{time: number; successful: boolean; id?: number}>;
}

const rooms = new Map<string, GameSession>();

class GameSession {
	private log?: FastifyBaseLogger;
	private world = new GameWorld();

	private clients = new Set<WebSocket>();
	private roles = new Map<WebSocket, Role>();
	private leftCtrl?: WebSocket;
	private rightCtrl?: WebSocket;
    
    private expected: {left?: Player; right?: Player} = {};

	private leftStats: GameStats = {
		paddle_hits: 0,
		max_ball_speed: 0,
		power_ups_collected: 0,
		skills_used: 0,
		smashes: []
	};
	private rightStats: GameStats = {
		paddle_hits: 0,
		max_ball_speed: 0,
		power_ups_collected: 0,
		skills_used: 0,
		smashes: []
	};

	private tickTimer?: NodeJS.Timeout;
	private broadcastTimer?: NodeJS.Timeout;

	private leftCtrlDisconnectedAt: number | null = null;
	private rightCtrlDisconnectedAt: number | null = null;
	private hadBothCtrl = false;

	private reportedGameOver = false;

	private lastPaused = false;
	private lastGameOver = false;

    private timeScale = 1;

	private emptySince: number | null = null;

	private isTournament: boolean = false;
	private tournamentId?: string;
	private matchId?: string;

	constructor(private readonly roomId?: string, log?: FastifyBaseLogger) {
		this.startLoops();
		this.log = log;
		
		this.world.setCallbacks({
			onPaddleHit: (side) => {
				const stats = side === 'left' ? this.leftStats : this.rightStats;
				stats.paddle_hits++;
			},
			onPowerUpCollected: (side, type, gameTime) => {
				const stats = side === 'left' ? this.leftStats : this.rightStats;
				stats.power_ups_collected++;
				
				if (this.roomId && this.expected[side]) {
					this.savePowerUpUsed(side, type, gameTime).catch(err => {
						this.log?.error({ error: err }, 'Failed to save power-up usage');
					});
				}
			},
			onBallSpeedUpdate: (speed) => {
				this.leftStats.max_ball_speed = Math.max(this.leftStats.max_ball_speed, speed);
				this.rightStats.max_ball_speed = Math.max(this.rightStats.max_ball_speed, speed);
			},
			onSmashSuccess: (side, gameTime) => {
				const stats = side === 'left' ? this.leftStats : this.rightStats;
				for (let i = stats.smashes.length - 1; i >= 0; i--) {
					if (!stats.smashes[i].successful && Math.abs(stats.smashes[i].time - gameTime) < 1) {
						stats.smashes[i].successful = true;
						break;
					}
				}
			}
		});
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

    setPlayers(players: {left: Player; right: Player}, metadata?: {
		isTournament?: boolean;
		tournamentId?: string;
		matchId?: string;
	}) {
        this.expected.left = players.left;
        this.expected.right = players.right;

		if (metadata) {
            this.isTournament = metadata.isTournament || false;
            this.tournamentId = metadata.tournamentId;
            this.matchId = metadata.matchId;
        }

        this.log?.info({roomId: this.roomId, players: this.expected}, 'match set');
    }

	addClient(ws: WebSocket) {
		ws.on('message', (raw: Buffer) => this.onMessage(ws, raw));
		ws.on('close', () => this.onClose(ws));
		ws.on('error', () => this.onClose(ws));
	}

	private assignRole(ws: WebSocket, playerId?: string): Role {
		if (!this.expected.left?.id && !this.expected.right?.id)
		{
			throw new Error("Invalid room: no players expected")
		}
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
        return ('spectator');
	}

    private onMessage(ws: WebSocket, raw: Buffer) {
        const msg = safeParse<ClientMessage>(raw.toString());
        if (!msg) {
            return;
        }
        const role = this.roles.get(ws);
        const canCtrl = (role === 'left' && ws === this.leftCtrl) ||
            (role === 'right' && ws === this.rightCtrl);
        switch (msg.type) {
            case 'input': {
                if (role === 'left' && ws === this.leftCtrl) {
                    const intention = msg.up && !msg.down ? -1 : msg.down && !msg.up ? 1 : 0;
                    this.world.applyInput('left', intention);
                }
                else if (role === 'right' && ws === this.rightCtrl) {
                    const intention = msg.up && !msg.down ? -1 : msg.down && !msg.up ? 1 : 0;
                    this.world.applyInput('right', intention)
                }
                break;
            }
            case 'smash': {
                if (role === 'left' || role === 'right') {
                    this.world.pressSmash(role);
					const stats = role === 'left' ? this.leftStats : this.rightStats;
					stats.skills_used++;
					stats.smashes.push({
						time: this.world.state.clock,
						successful: false
					});
                }
                break;
            }
            case 'pause':
                if (!canCtrl) {
                    this.send(ws, { type: 'error', message: 'Spectators can\'t pause the game' });
                    break;
                }
                this.world.pause();
                break;
            case 'resume': {
                if (!canCtrl) {
                    this.send(ws, { type: 'error', message: 'Spectators can\'t resume the game' });
                    break;
                }
                this.world.resume();
                break;
            }
            case 'logIn':
                try {
                    const assRole = this.assignRole(ws, msg.id);
                    this.clients.add(ws);
                    this.roles.set(ws, assRole);

                    this.send(ws, {
                        type: 'welcome',
                        side: assRole,
                        isTournament: this.isTournament,
                        tournamentId: this.tournamentId
                    });

                    this.log?.info({ roomId: this.roomId, assRole, clients: this.clients.size, playerId: msg.id }, 'client connected');

                    const haveBoth = !!this.leftCtrl && !!this.rightCtrl;
                    if (haveBoth && !this.hadBothCtrl) {
                        this.world.startCountdown();
                        this.notifyGameStarted();
                    }
                    this.hadBothCtrl = haveBoth;
                }
                catch (err) {
                    this.send(ws, { type: 'error', message: 'no player expected for this room.' })
                }
                break;
            case 'ping':
                this.send(ws, { type: 'pong', t: msg.t });
                break;
            case 'debug': {
                const allowDebug = (process.env.ALLOW_DEBUG === '1');
                if (!allowDebug) {
                    this.send(ws, { type: 'error', message: 'Debug disabled on server' });
                    break;
                }

                try {
                    switch (msg.action) {
                        case 'activate_powerup':
                            this.world.debugActivatePowerUp(msg.payload.kind);
                            break;
                        case 'clear_powerups':
                            this.world.debugClearPowerUps();
                            break;
                        case 'score_change':
                            this.world.debugChangeScore(msg.payload.side, msg.payload.amount);
                            break;
                        case 'reset_score':
                            this.world.debugResetScore();
                            break;
                        case 'set_score':
                            this.world.debugSetScore(msg.payload.left, msg.payload.right);
                            break;
                        case 'ball_control':
                            this.world.debugBallControl(msg.payload.mode);
                            break;
                        case 'ball_speed':
                            this.world.debugBallSpeed(msg.payload.mode);
                            break;
                        case 'time_scale':
                            this.timeScale = Math.max(0.1, Math.min(4, msg.payload.scale));
                            break;
                    }
                } catch (e) {
                    this.send(ws, { type: 'error', message: 'Debug action failed' });
                }
                break;
            }
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

    private async notifyGameStarted(): Promise<void> {
        if (!this.roomId) return;
        
        try
        {
            const host = process.env.VITE_HOST || 'localhost:8443';
            const url = `https://${host}/gamedb/games/room/${this.roomId}/start`;
            
            await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            
            this.log?.info({ roomId: this.roomId }, 'Game start notified to database');
        }
        catch (err)
        {
            this.log?.error({ roomId: this.roomId, error: err }, 'Failed to notify game start');
        }
    }

	private async savePowerUpUsed(side: 'left' | 'right', type: 'split' | 'blackout' | 'blackhole', gameTime: number): Promise<void> {
		if (!this.roomId) return;

		const player = side === 'left' ? this.expected.left : this.expected.right;
		if (!player) return;

		try {
			const host = process.env.VITE_HOST || 'localhost:8443';
			const isDevelopment = process.env.NODE_ENV === 'development';
			const agent = isDevelopment ? new (await import('https')).Agent({ rejectUnauthorized: false }) : undefined;

			const gameResponse = await fetch(`https://${host}/gamedb/games/room/${this.roomId}`, {
				// @ts-ignore
				agent
			});
			const gameData = await gameResponse.json();
			
			if (!gameData.success || !gameData.game?.id) {
				return;
			}

			await fetch(`https://${host}/gamedb/power-ups`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					game_id: gameData.game.id,
					player_id: player.id,
					power_up_type: type,
					collected_at_game_time: gameTime,
					activated_at_game_time: gameTime
				}),
				// @ts-ignore
				agent
			});

			this.log?.info({ gameId: gameData.game.id, playerId: player.id, type, gameTime }, 'Power-up saved');
		} catch (err) {
			this.log?.error({ error: err }, 'Failed to save power-up');
		}
	}

	private async saveGameStats(gameId: string): Promise<void> {
		if (!this.expected.left || !this.expected.right || !this.roomId) {
			return;
		}

		const host = process.env.VITE_HOST || 'localhost:8443';
		const isDevelopment = process.env.NODE_ENV === 'development';
		const agent = isDevelopment ? new (await import('https')).Agent({ rejectUnauthorized: false }) : undefined;

		const savePlayerStats = async (side: 'left' | 'right') => {
			const player = side === 'left' ? this.expected.left : this.expected.right;
			const stats = side === 'left' ? this.leftStats : this.rightStats;

			if (!player) return;

			try {
				await fetch(`https://${host}/gamedb/game-stats`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						game_id: gameId,
						player_id: player.id,
						side: side,
						paddle_hits: stats.paddle_hits,
						max_ball_speed: Math.round(stats.max_ball_speed),
						power_ups_collected: stats.power_ups_collected,
						skills_used: stats.skills_used
					}),
					// @ts-ignore
					agent
				});

				for (const smash of stats.smashes) {
					await fetch(`https://${host}/gamedb/skills`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							game_id: gameId,
							player_id: player.id,
							skill_type: 'smash',
							activated_at_game_time: smash.time,
							was_successful: smash.successful
						}),
						// @ts-ignore
						agent
					});
				}

				this.log?.info({ gameId, playerId: player.id, side }, 'Game stats saved');
			} catch (err) {
				this.log?.error({ gameId, playerId: player.id, error: err }, 'Failed to save game stats');
			}
		};

		await Promise.all([
			savePlayerStats('left'),
			savePlayerStats('right')
		]);
	}

	private async notifyGameEnd(reason: 'score' | 'timeout', winner?: 'left' | 'right'): Promise<void> {
        if (this.reportedGameOver)
		{
            return;
        }
        this.reportedGameOver = true;

		const winnerId = winner === 'left' ? this.expected.left?.id : this.expected.right?.id;

		if (this.isTournament && this.matchId && winnerId)
		{
            await this.notifyTournamentMatchEnd(this.matchId, winnerId);
        }

        const host = process.env.VITE_HOST || 'localhost:8443';
        const endpoint = '/quickplay/room-finished';
        const url = `https://${host}${endpoint}`;

        try
		{
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

			if (this.roomId) {
				try {
					const gameResponse = await fetch(`https://${host}/gamedb/games/room/${this.roomId}`);
					const gameData = await gameResponse.json();
					if (gameData.success && gameData.game?.id) {
						await this.saveGameStats(gameData.game.id);
					}
				} catch (err) {
					this.log?.error({ error: err }, 'Failed to retrieve game ID for stats');
				}
			}
        }
		catch (err)
		{
            this.log?.error({ roomId: this.roomId, error: err }, 'Failed to notify game end');
        }
    }

	private async notifyTournamentMatchEnd(matchId: string, winnerId: string): Promise<void> {
        const host = process.env.VITE_HOST || 'localhost:8443';
        const endpoint = '/tournamentback/match-finished';
        const url = `https://${host}${endpoint}`;

        try
		{
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId,
                    winnerId
                })
            });

            this.log?.info({ 
                roomId: this.roomId, 
                matchId, 
                winnerId 
            }, 'Tournament match end notified');
        }
		catch (err)
		{
            this.log?.error({ 
                roomId: this.roomId, 
                error: err 
            }, 'Failed to notify tournament match end');
        }
    }

	private startLoops() {
		this.tickTimer = setInterval(() => {
			this.world.update(SERVER_DT * this.timeScale);
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
				this.broadcast({
					type: 'gameover', 
					winner: state.winner || 'left',
					isTournament: this.isTournament,
					tournamentId: this.tournamentId
				});
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
			}
			else
			{
				this.emptySince = null;
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

export const getSessionForRoom = (roomId: string, log?: FastifyBaseLogger) => {
    if (!rooms.has(roomId))
    {
        log?.warn(`Attempt to access non-existent room: ${roomId}`);
        return null;
    }
    return (rooms.get(roomId)!);
}

export const setMatchForRoom = (
	roomId: string,
	players: {left: Player; right: Player},
	metadata?: {
		isTournament?: boolean;
		tournamentId?: string;
		matchId?: string;
	},
	log?: FastifyBaseLogger
) => {
    const session = new GameSession(roomId, log);
	if (!session)
		return null;
	rooms.set(roomId, session);
    session.setPlayers(players, metadata);
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
