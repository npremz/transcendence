export type PublicState = {
	leftPaddle: {y: number; speed: number; intention: number};
	rightPaddle: {y: number; speed: number; intention: number};
	balls: {x: number; y: number; vx: number; vy: number; radius: number}[];
	score: {left: number; right: number};
	isPaused: boolean;
	isGameOver: boolean;
	winner: '' | 'left' | 'right';
	countdownValue: number;
	powerUps: {x: number, y: number, radius: number}[];
	splitActive: boolean;
	clock: number;
	smash: {
		cooldown: number;
		animDuration: number;
		left: {cooldownRemaining: number; lastSmashAt: number};
		right: {cooldownRemaining: number; lastSmashAt: number};
	};
};

type ServerMsg = 
	| {type: 'welcome'; side: 'left' | 'right'}
	| {type: 'state'; state: PublicState; serverTime: number}
	| {type: 'countdown'; value: number}
	| {type: 'paused' | 'resumed'}
	| {type: 'gameover'; winner: 'left' | 'right'}
	| {type: 'pong'; t: number};

export class WSClient {
	private ws?: WebSocket;
	side: 'left' | 'right' = 'left';

	onState?: (s: PublicState) => void;
	onCountdown?: (v: number) => void;
	onGameOver?: (w: 'left' | 'right') => void;

	connect(url?: string) {
		//const defaultUrl = `wss://${location.hostname}:8443/gameback/game`;
		const host = import.meta.env.VITE_HOST
		const endpoint = import.meta.env.VITE_GAME_ENDPOINT
		const defaultUrl = (host && endpoint) ? `wss://${host}${endpoint}`
					: 'wss://localhost:8443/gameback/game';
		this.ws = new WebSocket(url ?? defaultUrl);

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
				case 'gameover':
					this.onGameOver?.(msg.winner);
					break;
			}
		};
	}
	sendInput(up: boolean, down: boolean) {
		this.ws?.send(JSON.stringify({type: 'input', up, down}));
	}
	pause() {
		this.ws?.send(JSON.stringify({type: 'pause'}));
	}
	resume() {
		this.ws?.send(JSON.stringify({type: 'resume'}));
	}
	smash() {
		this.ws?.send(JSON.stringify({type: 'smash'}));
	}
}
