export type ClientMessage =
	| {type: 'input'; up: boolean; down: boolean }
	| {type: 'pause'}
	| {type: 'resume'}
	| {type: 'ping'; t: number};

export type ServerMessage = 
	| {type: 'welcome'; side: 'left' | 'right'}
	| {type: 'state'; state: PublicState; serverTime: number}
	| {type: 'countdown'; value: number}
	| {type: 'paused'}
	| {type: 'resumed'}
	| {type: 'gameover'; winner: 'left' | 'right'}
	| {type: 'pong'; t: number}
	| {type: 'error'; message: string};

export type PublicState = {
	leftPaddle: {y: number; speed: number; intention: number};
	rightPaddle: {y: number; speed: number; intention: number};
	balls: {x: number; y: number; vx: number, vy: number; radius: number}[];
	score: {left: number; right: number;};
	isPaused: boolean;
	isGameOver: boolean;
	winner: '' | 'left' | 'right';
	countdownValue: number;
	powerUps: {x: number; y: number; radius: number}[];
	splitActive: boolean;
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