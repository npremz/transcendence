export type Side = 'left' | 'right';

export type Ball = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	lastPaddleHit: '' | 'left' | 'right';
};

export type PowerUp = {
	id: number;
	x: number;
	y: number;
	radius: number;
	expiresAt: number;
	type: 'split' | 'blackout';
};

export type SmashSideState = {
	availableAt: number;
	lastPressAt: number;
	lastSmashAt: number;
};

export type GameState = {
	leftPaddle: {speed: number; y: number; intention: number};
	rightPaddle: {speed: number; y: number; intention: number};
	balls: Ball[];
	score: { left: number; right: number};
	isPaused: boolean;
	isGameOver: boolean;
    isTimeoutLeft: boolean;
    isTimeoutRight: boolean;
    isTimeoutBoth: boolean;
	winner: '' | 'left' | 'right';
	clock: number;
	countdownValue: number;
	countdownTimer: number;
	powerUps: PowerUp[];
	nextPowerUpAt: number;
	splitActive: boolean;
	splitEndsAt: number;

	blackoutLeft: boolean;
	blackoutRight: boolean;
	blackoutLeftEndsAt: number;
	blackoutRightEndsAt: number;
	blackoutLeftIntensity: number;
	blackoutRightIntensity: number;

	smash: {
		left: SmashSideState;
		right: SmashSideState;
	}
};