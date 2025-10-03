export type ClientMessage =
	| {type: 'input'; up: boolean; down: boolean }
	| {type: 'pause'}
	| {type: 'resume'}
	| {type: 'ping'; t: number}
	| {type: 'smash'}
	| {type: 'logIn'; id: string};

export type ServerMessage = 
	| {type: 'welcome'; side: 'left' | 'right' | 'spectator'}
	| {type: 'state'; state: PublicState; serverTime: number}
	| {type: 'countdown'; value: number}
	| {type: 'paused'}
	| {type: 'resumed'}
    | {type: 'timeout_status'; left: {active: boolean; remainingMs: number};
                               right: {active: boolean; remainingMs: number}}
	| {type: 'gameover'; winner: 'left' | 'right' | 'nobody'}
	| {type: 'pong'; t: number}
	| {type: 'error'; message: string};

export type PublicState = {
	leftPaddle: {y: number; speed: number; intention: number};
	rightPaddle: {y: number; speed: number; intention: number};
	balls: {x: number; y: number; vx: number, vy: number; radius: number}[];
	score: {left: number; right: number;};
	isPaused: boolean;
	isGameOver: boolean;
    isTimeoutLeft: boolean;
    isTimeoutRight: boolean;
    isTimeoutBoth: boolean;
	winner: '' | 'left' | 'right' | 'nobody';
	countdownValue: number;
	powerUps: {x: number; y: number; radius: number}[];
	splitActive: boolean;
	clock: number;
	blackoutLeft: boolean;
	blackoutRight: boolean;
	blackoutLeftIntensity: number;
	blackoutRightIntensity: number;

	smash: {
		cooldown: number;
		animDuration: number;
		left: {cooldownRemaining: number; lastSmashAt: number};
		right: {cooldownRemaining: number; lastSmashAt: number};
	};
};

export function safeParse<T>(raw: string): T | null {
	try 
	{
		return JSON.parse(raw) as T;
	}
	catch
	{
		return (null);
	}
}