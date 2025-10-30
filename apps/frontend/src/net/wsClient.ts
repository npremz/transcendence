export type PublicState = {
	leftPaddle: {y: number; speed: number; intention: number};
	rightPaddle: {y: number; speed: number; intention: number};
	balls: {x: number; y: number; vx: number; vy: number; radius: number}[];
	score: {left: number; right: number};
	isPaused: boolean;
	isGameOver: boolean;
	winner: '' | 'left' | 'right';
	countdownValue: number;
	powerUps: {x: number, y: number, radius: number, type: string}[];
	splitActive: boolean;
	clock: number;
	blackoutLeft: boolean;
	blackoutRight: boolean;
	blackoutLeftIntensity: number;
	blackoutRightIntensity: number;
	blackholeActive: boolean;
	blackholeProgress: number;
	blackholeCenterX: number;
	blackholeCenterY: number;
	selectedSkills: {
		left: 'smash' | 'dash';
		right: 'smash' | 'dash';
	};
	skillStates: {
		left: {cooldownRemaining: number; lastActivationAt: number};
		right: {cooldownRemaining: number; lastActivationAt: number};
	};
};

type ServerMsg = 
	| {type: 'welcome'; side: 'left' | 'right'; isTournament?: boolean; tournamentId?: string; players?: {left?: string; right?: string}}
	| {type: 'state'; state: PublicState; serverTime: number}
	| {type: 'countdown'; value: number}
	| {type: 'paused' | 'resumed'}
    | {type: 'timeout_status'; left: {active: boolean; remainingMs: number};
                               right: {active: boolean; remainingMs: number};}
	| {type: 'gameover'; winner: 'left' | 'right'; isTournament?: boolean; tournamentId?: string}
	| {type: 'pong'; t: number};

export class WSClient {
	private ws?: WebSocket;
	side: 'left' | 'right' = 'left';

	isTournament: boolean = false;
    tournamentId?: string;
	playerNames: {left?: string; right?: string} = {};

	onState?: (s: PublicState) => void;
	onCountdown?: (v: number) => void;
	onGameOver?: (w: 'left' | 'right', isTournament?: boolean, tournamentId?: string) => void;
    onPaused?: () => void;
    onResumed?: () => void;
    onTimeoutStatus?: (status: {
        left: {active: boolean; remainingMs: number};
        right: {active: boolean; remainingMs: number}
    }) => void;
    onWelcome?: (side: 'left' | 'right' | 'spectator', playerNames?: {left?: string; right?: string}) => void;

	connect(url?: string) {
		const host = import.meta.env.VITE_HOST
		const endpoint = import.meta.env.VITE_GAME_ENDPOINT
		const defaultUrl = (host && endpoint) ? `wss://${host}${endpoint}`
					: undefined;
		const finalUrl = url ?? defaultUrl;
        if (!finalUrl)
        {
            console.warn('WSClient: no URL provided and no defaultUrl');
            return;
        }
        console.log('WSClient: connecting to', finalUrl);
        this.ws = new WebSocket(finalUrl);
		this.ws.onopen = () => {
			const playerId = window.simpleAuth.getPlayerId();
			console.log('WebSocket opened, sending logIn with ID:', playerId);
			this.ws?.send(JSON.stringify({
				type: 'logIn', 
				id: playerId
			}));
		};
		this.ws.onmessage = (ev) => {
			const msg = JSON.parse(ev.data) as ServerMsg;
			switch (msg.type) {
				case 'welcome':
					console.log('Welcome from server');
					this.side = msg.side;
					this.playerNames = msg.players || {};
                    this.onWelcome?.(msg.side, msg.players);
					break;
				case 'state':
					this.onState?.(msg.state);
					break;
				case 'countdown':
					this.onCountdown?.(msg.value);
					break;
				case 'paused':
					this.onPaused?.();
					break;
				case 'resumed':
					this.onResumed?.();
					break;
				case 'timeout_status':
					this.onTimeoutStatus?.(msg);
					break;
				case 'gameover':
					this.onGameOver?.(msg.winner, msg.isTournament, msg.tournamentId);
					break;
			}
		};
	}

	sendInput(up: boolean, down: boolean) {
		this.ws?.send(JSON.stringify({ type: 'input', up, down }));
	}

	pause() {
		this.ws?.send(JSON.stringify({ type: 'pause' }));
	}

	resume() {
		this.ws?.send(JSON.stringify({ type: 'resume' }));
	}

	useSkill() {
		this.ws?.send(JSON.stringify({ type: 'skill' }));
	}

	forfeit() {
		this.ws?.send(JSON.stringify({ type: 'forfeit' }));
	}

    debugActivatePowerUp(kind: 'split' | 'blackout' | 'blackhole') {
        this.ws?.send(JSON.stringify({ 
        type: 'debug', 
        action: 'activate_powerup', 
        payload: { kind } 
        }));
    }

    debugClearPowerUps() {
        this.ws?.send(JSON.stringify({ type: 'debug', action: 'clear_powerups' }));
    }

    debugScoreChange(side: 'left' | 'right', amount: number) {
        this.ws?.send(JSON.stringify({
            type: 'debug', action: 'score_change', payload: { side, amount }
        }));
    }

    debugResetScore() {
        this.ws?.send(JSON.stringify({ type: 'debug', action: 'reset_score' }));
    }

    debugSetScore(left: number, right: number) {
        this.ws?.send(JSON.stringify({
            type: 'debug', action: 'set_score', payload: { left, right }
        }));
    }

    debugBallControl(mode: 'add' | 'remove' | 'reset') {
        this.ws?.send(JSON.stringify({
            type: 'debug', action: 'ball_control', payload: { mode }
        }));
    }

    debugBallSpeed(mode: 'multiply' | 'divide' | 'freeze') {
        this.ws?.send(JSON.stringify({
            type: 'debug', action: 'ball_speed', payload: { mode }
        }));
    }

    debugTimeScale(scale: number) {
        this.ws?.send(JSON.stringify({
            type: 'debug', action: 'time_scale', payload: { scale }
        }));
    }

    debugChangeSkill(side: 'left' | 'right', skill: 'smash' | 'dash') {
        this.ws?.send(JSON.stringify({
            type: 'debug', action: 'change_skill', payload: { side, skill }
        }));
    }

	disconnect(): void {
		if (this.ws) {
			console.log('WSClient: disconnecting...');
	
			this.ws.onopen = null;
			this.ws.onmessage = null;
			this.ws.onerror = null;
			this.ws.onclose = null;
			
			if (this.ws.readyState === WebSocket.OPEN || 
				this.ws.readyState === WebSocket.CONNECTING) {
				this.ws.close();
			}
			
			this.ws = undefined;
		}
	}

	cleanup(): void {
		console.log('WSClient: cleaning up...');
		
		// 1. Nettoyer tous les callbacks custom
		this.onState = undefined;
		this.onCountdown = undefined;
		this.onGameOver = undefined;
		this.onPaused = undefined;
		this.onResumed = undefined;
		this.onTimeoutStatus = undefined;
		this.onWelcome = undefined;
		
		// 2. Fermer la connexion WebSocket
		this.disconnect();
		
		// 3. Reset les données
		this.side = 'left';
		this.isTournament = false;
		this.tournamentId = undefined;
		this.playerNames = {};
	}
}
