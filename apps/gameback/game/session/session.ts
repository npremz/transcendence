import type { WebSocket, WebsocketHandler } from "@fastify/websocket";
import type { FastifyBaseLogger } from "fastify";
import { GameWorld } from "../engine/world";
import { SERVER_DT, SERVER_TICK_HZ, BROADCAST_HZ, TIMEOUT_MS } from "../engine/constants";
import type { ClientMessage, ServerMessage } from "../ws/messageTypes";
import { safeParse } from "../ws/messageTypes";
import type { SkillType } from "../engine/types";

type Role = 'left' | 'right' | 'spectator';
type Player = {id: string; username: string; avatar?: string; selectedSkill?: SkillType};

interface GameStats {
	paddle_hits: number;
	max_ball_speed: number;
	power_ups_collected: number;
	skills_used: number;
	smashes: Array<{time: number; successful: boolean; id?: number}>;
	dashes: Array<{time: number; successful: boolean; id?: number}>;
}

const rooms = new Map<string, GameSession>();

class GameSession {
	private log?: FastifyBaseLogger;
	private world = new GameWorld();

	private clients = new Set<WebSocket>();
	private roles = new Map<WebSocket, Role>();
	private leftCtrl?: WebSocket;
	private rightCtrl?: WebSocket;
	private leftReady: boolean = false;
	private rightReady: boolean = false;
	private gameStarted: boolean = false;

    private expected: {left?: Player; right?: Player} = {};

	private leftStats: GameStats = {
		paddle_hits: 0,
		max_ball_speed: 0,
		power_ups_collected: 0,
		skills_used: 0,
		smashes: [],
		dashes: []
	};
	private rightStats: GameStats = {
		paddle_hits: 0,
		max_ball_speed: 0,
		power_ups_collected: 0,
		skills_used: 0,
		smashes: [],
		dashes: []
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
	private classicMode: boolean = false;
	private tournamentConnectionTimeout?: NodeJS.Timeout;
	private readonly TOURNAMENT_CONNECTION_TIMEOUT_MS = 10000; // 10 secondes

	constructor(private readonly roomId?: string, log?: FastifyBaseLogger) {
		this.startLoops();
		this.log = log;

		// Start the game in paused state, waiting for both players to be ready
		this.world.state.isPaused = true;

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
			onSkillSuccess: (side, skillType, gameTime) => {
				const stats = side === 'left' ? this.leftStats : this.rightStats;
				const skillArray = skillType === 'smash' ? stats.smashes : stats.dashes;
				for (let i = skillArray.length - 1; i >= 0; i--) {
					if (!skillArray[i].successful && Math.abs(skillArray[i].time - gameTime) < 1) {
						skillArray[i].successful = true;
						break;
					}
				}
			},
			onGoalScored: (scorerSide, ballYPosition, gameTime) => {
				if (this.roomId) {
					this.saveGoalScored(scorerSide, ballYPosition, gameTime).catch(err => {
						this.log?.error({ error: err }, 'Failed to save goal');
					});
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
		this.clearTournamentConnectionTimeout();
		this.clients.clear();
		this.roles.clear();
		this.leftCtrl = undefined;
		this.rightCtrl = undefined;
	}

    setPlayers(players: {left: Player; right: Player}, metadata?: {
		isTournament?: boolean;
		tournamentId?: string;
		matchId?: string;
		classicMode?: boolean;
	}) {
        this.expected.left = players.left;
        this.expected.right = players.right;

		if (metadata) {
            this.isTournament = metadata.isTournament || false;
            this.tournamentId = metadata.tournamentId;
            this.matchId = metadata.matchId;
			this.classicMode = metadata.classicMode || false;
        }

		// En mode classique, on désactive les skills et les powerups
		if (this.classicMode) {
			this.world.setClassicMode(true);
		} else {
			if (players.left.selectedSkill) {
				this.world.setSkill('left', players.left.selectedSkill);
			}
			if (players.right.selectedSkill) {
				this.world.setSkill('right', players.right.selectedSkill);
			}
		}

		// Pour les tournois, démarrer un timer de connexion
		if (this.isTournament) {
			this.startTournamentConnectionTimeout();
		}

        this.log?.info({roomId: this.roomId, players: this.expected, classicMode: this.classicMode}, 'match set');
    }

	addClient(ws: WebSocket) {
		ws.on('message', (raw: Buffer) => this.onMessage(ws, raw));
		ws.on('close', () => this.onClose(ws));
		ws.on('error', () => this.onClose(ws));
	}

	private startTournamentConnectionTimeout(): void {
		// Annuler tout timer existant
		if (this.tournamentConnectionTimeout) {
			clearTimeout(this.tournamentConnectionTimeout);
		}

		this.log?.info({ roomId: this.roomId }, `Tournament match: waiting ${this.TOURNAMENT_CONNECTION_TIMEOUT_MS}ms for players to connect`);

		this.tournamentConnectionTimeout = setTimeout(() => {
			// Vérifier si les deux joueurs sont connectés et prêts
			const leftConnected = !!this.leftCtrl;
			const rightConnected = !!this.rightCtrl;

			if (!this.gameStarted) {
				if (!leftConnected && !rightConnected) {
					// Les deux joueurs absents - annuler le match (pas de gagnant)
					this.log?.warn({ roomId: this.roomId }, 'Tournament match cancelled: both players failed to connect');
					this.endGameWithWinner('nobody');
				} else if (!leftConnected) {
					// Joueur gauche absent - joueur droit gagne par forfait
					this.log?.warn({ roomId: this.roomId }, 'Tournament forfeit: left player failed to connect');
					this.endGameWithWinner('right');
				} else if (!rightConnected) {
					// Joueur droit absent - joueur gauche gagne par forfait
					this.log?.warn({ roomId: this.roomId }, 'Tournament forfeit: right player failed to connect');
					this.endGameWithWinner('left');
				}
				// Si les deux sont connectés mais pas prêts, on laisse le timer normal gérer
			}
		}, this.TOURNAMENT_CONNECTION_TIMEOUT_MS);
	}

	private clearTournamentConnectionTimeout(): void {
		if (this.tournamentConnectionTimeout) {
			clearTimeout(this.tournamentConnectionTimeout);
			this.tournamentConnectionTimeout = undefined;
		}
	}

	private endGameWithWinner(winner: 'left' | 'right' | 'nobody'): void {
		this.world.state.isGameOver = true;
		this.world.state.winner = winner === 'nobody' ? '' : winner;

		// Broadcast game over
		this.broadcast({
			type: 'gameover',
			winner: winner,
			isTournament: this.isTournament,
			tournamentId: this.tournamentId
		});

		// Notifier le tournamentback si c'est un match de tournoi
		if (winner !== 'nobody') {
			this.notifyGameEnd('forfeit', winner);
		}

		this.log?.info({ roomId: this.roomId, winner }, 'Game ended due to connection timeout');
	}

	private assignRole(ws: WebSocket, playerId?: string): Role {
		if (!this.expected.left?.id && !this.expected.right?.id)
		{
			throw new Error("Invalid room: no players expected")
		}
		if (this.expected.left?.id || this.expected.right?.id) 
        {
            if (playerId && this.expected.left?.id === playerId)
            {
                if (this.leftCtrl && this.leftCtrl !== ws) {
                    this.roles.set(this.leftCtrl, 'spectator'); 
                    this.log?.info({ roomId: this.roomId }, 'Left player hot-reconnected, overwriting old socket');
                }
                this.leftCtrl = ws;
                this.leftCtrlDisconnectedAt = null;
                return ('left');
            }
            
            if (playerId && this.expected.right?.id === playerId)
            {
                if (this.rightCtrl && this.rightCtrl !== ws) {
                    this.roles.set(this.rightCtrl, 'spectator');
                    this.log?.info({ roomId: this.roomId }, 'Right player hot-reconnected, overwriting old socket');
                }
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
            case 'skill': {
                if (role === 'left' || role === 'right') {
					const skillType = this.world.state.selectedSkills[role];
                    this.world.useSkill(role);
					const stats = role === 'left' ? this.leftStats : this.rightStats;
					stats.skills_used++;
					
					if (skillType === 'smash') {
						stats.smashes.push({
							time: this.world.state.clock,
							successful: false
						});
					} else if (skillType === 'dash') {
						stats.dashes.push({
							time: this.world.state.clock,
							successful: false
						});
					}

                    const smashActivated = this.world.pressSmash(role);
					if (smashActivated) {
						const legacyStats = role === 'left' ? this.leftStats : this.rightStats;
						legacyStats.skills_used++;
						legacyStats.smashes.push({
							time: this.world.state.clock,
							successful: false
						});
					}
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
            case 'forfeit': {
                if (!canCtrl) {
                    this.send(ws, { type: 'error', message: 'Spectators can\'t forfeit' });
                    break;
                }
                // Determine who forfeited and who wins
                const forfeitingSide = role as 'left' | 'right';
                const winningSide = forfeitingSide === 'left' ? 'right' : 'left';
                
                // End the game immediately
                this.world.state.isGameOver = true;
                this.world.state.winner = winningSide;
                
                // Broadcast game over
                this.broadcast({
                    type: 'gameover',
                    winner: winningSide,
                    isTournament: this.isTournament,
                    tournamentId: this.tournamentId
                });
                
                // Save game end with forfeit reason
                this.notifyGameEnd('forfeit', winningSide);
                
                this.log?.info({ roomId: this.roomId, forfeitingSide, winningSide }, 'Player forfeited');
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
                        tournamentId: this.tournamentId,
                        players: {
                            left: this.expected.left?.username,
                            right: this.expected.right?.username
                        },
                        avatars: {
                            left: this.expected.left?.avatar,
                            right: this.expected.right?.avatar
                        }
                    });

                    this.log?.info({ roomId: this.roomId, assRole, clients: this.clients.size, playerId: msg.id }, 'client connected');

                    const haveBoth = !!this.leftCtrl && !!this.rightCtrl;
                    // If game has already started and both players are now connected, start countdown before resuming
                    if (this.gameStarted && haveBoth && this.world.state.isPaused && this.world.state.countdownValue === 0) {
                        this.world.startCountdown();
                        this.log?.info({ roomId: this.roomId }, 'Player reconnected - starting countdown before resuming game');
                    }
                    this.hadBothCtrl = haveBoth;
                }
                catch (err) {
                    this.send(ws, { type: 'error', message: 'no player expected for this room.' })
                }
                break;
            case 'ready': {
                const role = this.roles.get(ws);
                if (role === 'left' && ws === this.leftCtrl) {
                    this.leftReady = true;
                    this.log?.info({ roomId: this.roomId, side: 'left' }, 'Player ready');
                } else if (role === 'right' && ws === this.rightCtrl) {
                    this.rightReady = true;
                    this.log?.info({ roomId: this.roomId, side: 'right' }, 'Player ready');
                } else {
                    this.send(ws, { type: 'error', message: 'Only players can signal ready' });
                    break;
                }

                // Start the game only when both players are connected AND ready
                const bothReady = this.leftReady && this.rightReady;
                const bothConnected = !!this.leftCtrl && !!this.rightCtrl;
                if (bothReady && bothConnected && !this.gameStarted) {
                    // Annuler le timer de connexion tournoi
                    this.clearTournamentConnectionTimeout();
                    
                    this.world.startCountdown();
                    this.notifyGameStarted();
                    this.gameStarted = true;
                    this.hadBothCtrl = true;
                    this.log?.info({ roomId: this.roomId }, 'Both players ready - starting game');
                }
                break;
            }
            case 'ping':
                this.send(ws, { type: 'pong', t: msg.t });
                break;
            case 'debug': {
                //const allowDebug = (process.env.ALLOW_DEBUG === '1');
                //if (!allowDebug) {
                 //   this.send(ws, { type: 'error', message: 'Debug disabled on server' });
                 //   break;
                //}

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
                        case 'change_skill':
                            this.world.setSkill(msg.payload.side, msg.payload.skill);
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
			// Only reset ready flag if game hasn't started yet
			if (!this.gameStarted) {
				this.leftReady = false;
			}
            this.leftCtrlDisconnectedAt = Date.now();
            this.log?.info({roomId: this.roomId, role}, 'client disconnected starting 30s timeout');
		}
		if (this.rightCtrl === ws)
		{
			this.rightCtrl = undefined;
			// Only reset ready flag if game hasn't started yet
			if (!this.gameStarted) {
				this.rightReady = false;
			}
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
            const url = `http://database:3020/games/room/${this.roomId}/start`;
            
            await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
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
			const gameResponse = await fetch(`http://database:3020/games/room/${this.roomId}`);
			const gameData = await gameResponse.json();
			
			if (!gameData.success || !gameData.game?.id) {
				return;
			}

			await fetch(`http://database:3020/power-ups`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					game_id: gameData.game.id,
					player_id: player.id,
					power_up_type: type,
					collected_at_game_time: gameTime,
					activated_at_game_time: gameTime
				})
			});

			this.log?.info({ gameId: gameData.game.id, playerId: player.id, type, gameTime }, 'Power-up saved');
		} catch (err) {
			this.log?.error({ error: err }, 'Failed to save power-up');
		}
	}

	private async saveGoalScored(scorerSide: 'left' | 'right', ballYPosition: number, gameTime: number): Promise<void> {
		if (!this.roomId) return;

		try {
			const gameResponse = await fetch(`http://database:3020/games/room/${this.roomId}`);
			const gameData = await gameResponse.json();
			
			if (!gameData.success || !gameData.game?.id) {
				return;
			}

			const scoredAgainstSide = scorerSide === 'left' ? 'right' : 'left';

			await fetch(`http://database:3020/goals`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					game_id: gameData.game.id,
					scorer_side: scorerSide,
					scored_against_side: scoredAgainstSide,
					ball_y_position: ballYPosition,
					scored_at_game_time: gameTime
				})
			});

			this.log?.info({ gameId: gameData.game.id, scorerSide, ballYPosition, gameTime }, 'Goal saved');
		} catch (err) {
			this.log?.error({ error: err }, 'Failed to save goal');
		}
	}

	private async saveGameStats(gameId: string): Promise<void> {
		if (!this.expected.left || !this.expected.right || !this.roomId) {
			return;
		}

		const savePlayerStats = async (side: 'left' | 'right') => {
			const player = side === 'left' ? this.expected.left : this.expected.right;
			const stats = side === 'left' ? this.leftStats : this.rightStats;

			if (!player) return;

			try {
				await fetch(`http://database:3020/game-stats`, {
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
					})
				});

				for (const smash of stats.smashes) {
					await fetch(`http://database:3020/skills`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							game_id: gameId,
							player_id: player.id,
							skill_type: 'smash',
							activated_at_game_time: smash.time,
							was_successful: smash.successful
						})
					});
				}

				for (const dash of stats.dashes) {
					await fetch(`http://database:3020/skills`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							game_id: gameId,
							player_id: player.id,
							skill_type: 'dash',
							activated_at_game_time: dash.time,
							was_successful: dash.successful
						})
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

        const url = `http://quickplayback:3030/room-finished`;

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
					const gameResponse = await fetch(`http://database:3020/games/room/${this.roomId}`);
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
        const url = `http://tournamentback:3040/match-finished`;

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
        this.clearTournamentConnectionTimeout();
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
		classicMode?: boolean;
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
