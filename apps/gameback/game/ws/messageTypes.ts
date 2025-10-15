export type ClientMessage =
	| {type: 'input'; up: boolean; down: boolean }
	| {type: 'pause'}
	| {type: 'resume'}
	| {type: 'ping'; t: number}
	| {type: 'skill'}
	| {type: 'forfeit'}
	| {type: 'logIn'; id: string}
    | {type: 'debug'; action: 'activate_powerup'; payload: {kind: 'split' | 'blackout' | 'blackhole'}}
    | {type: 'debug'; action: 'clear_powerups'}
    | {type: 'debug'; action: 'score_change'; payload: {side: 'left' | 'right'; amount: number}}
    | {type: 'debug'; action: 'reset_score'}
    | {type: 'debug'; action: 'set_score'; payload: {left: number; right: number}}
    | {type: 'debug'; action: 'ball_control'; payload: {mode: 'add' | 'remove' | 'reset'}}
    | {type: 'debug'; action: 'ball_speed'; payload: {mode: 'multiply' | 'divide' | 'freeze'}}
    | {type: 'debug'; action: 'time_scale'; payload: {scale: number}}
    | {type: 'debug'; action: 'change_skill'; payload: {side: 'left' | 'right'; skill: 'smash' | 'dash'}};

export type ServerMessage = 
	| {type: 'welcome'; side: 'left' | 'right' | 'spectator'; isTournament?: boolean; tournamentId?: string; players?: {left?: string; right?: string}}
	| {type: 'state'; state: PublicState; serverTime: number}
	| {type: 'countdown'; value: number}
	| {type: 'paused'}
	| {type: 'resumed'}
    | {type: 'timeout_status'; left: {active: boolean; remainingMs: number};
                               right: {active: boolean; remainingMs: number}}
	| {type: 'gameover'; winner: 'left' | 'right' | 'nobody'; isTournament?: boolean; tournamentId?: string}
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
	winner: '' | 'left' | 'right' | 'nobody';
	countdownValue: number;
	powerUps: {x: number; y: number; radius: number; type: 'split' | 'blackout' | 'blackhole'}[];
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
