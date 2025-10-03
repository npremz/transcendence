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
	smash: {
		cooldown: number;
		animDuration: number;
		left: {cooldownRemaining: number; lastSmashAt: number};
		right: {cooldownRemaining: number; lastSmashAt: number};
	};
};

type ServerMsg = 
	| {type: 'welcome'; side: 'left' | 'right'; isTournament?: boolean; tournamentId?: string}
	| {type: 'state'; state: PublicState; serverTime: number}
	| {type: 'countdown'; value: number}
	| {type: 'paused' | 'resumed'}
    | {type: 'resumed'}
    | {type: 'timeout_status'; left: {active: boolean; remainingMs: number};
                               right: {active: boolean; remainingMs: number};}
	| {type: 'gameover'; winner: 'left' | 'right'; isTournament?: boolean; tournamentId?: string}
	| {type: 'pong'; t: number};

export class WSClient {
	private ws?: WebSocket;
	side: 'left' | 'right' = 'left';

	isTournament: boolean = false;
    tournamentId?: string;

	onState?: (s: PublicState) => void;
	onCountdown?: (v: number) => void;
	onGameOver?: (w: 'left' | 'right', isTournament?: boolean, tournamentId?: string) => void;
    onPaused?: () => void;
    onResumed?: () => void;
    onTimeoutStatus?: (status: {
        left: {active: boolean; remainingMs: number};
        right: {active: boolean; remainingMs: number}
    }) => void;
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
			console.log(ev.data)
			const msg = JSON.parse(ev.data) as ServerMsg;
			switch (msg.type) {
				case 'welcome':
					console.log('Welcome from server');
					this.side = msg.side;
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
	smash() {
		this.ws?.send(JSON.stringify({ type: 'smash' }));
	}
}
