import { WORLD_WIDTH, WORLD_HEIGHT, POWERUP_MIN_DELAY_SEC,
	POWERUP_EXTRA_RANDOM_SEC, POWERUP_LIFETIME_SEC, SPLIT_DURATION_SEC, 
	POWERUP_RADIUS, MAX_BALLS_ON_FIELD, SPLIT_SPAWN_PER_PICKUP, SPLIT_SPREAD_DEG,
	POWERUP_MAX_ON_SCREEN, BLACKOUT_DURATION_SEC, BLACKOUT_FADE_DURATION_SEC,
	BLACKHOLE_DURATION_SEC, BLACKHOLE_PULL, BLACKHOLE_SWIRL, BALL_MAX_SPEED,
	BALL_INITIAL_SPEED} from "./constants";
import { length2, scheduleAfter } from "./helpers";
import type { Ball, GameState } from "./types";

let PU_ID = 1;

export const scheduleNextPowerUp = (state: GameState) => {
	state.nextPowerUpAt = scheduleAfter(state.clock, POWERUP_MIN_DELAY_SEC, POWERUP_EXTRA_RANDOM_SEC);
};

export const spawnPowerUp = (state: GameState) => {
	if (state.powerUps.length >= POWERUP_MAX_ON_SCREEN)
	{
		return;
	}
	const types: Array<'split' | 'blackout' | 'blackhole'> = ['split', 'blackout', 'blackhole'];
	const type = types[Math.floor(Math.random() * types.length)];
	const margin = 150;
	state.powerUps.push({
		id: PU_ID++,
		x: margin + Math.random() * (WORLD_WIDTH - 2 * margin),
		y: margin + Math.random() * (WORLD_HEIGHT - 2 * margin),
		radius: POWERUP_RADIUS,
		expiresAt: state.clock + POWERUP_LIFETIME_SEC,
		type: type
	});
};

export const pruneExpiredPowerUps = (state: GameState) => {
	state.powerUps = state.powerUps.filter(p => p.expiresAt > state.clock);
}

export const activateSplit = (state: GameState, fromBall?: Ball) => {
	const spreadRad = (SPLIT_SPREAD_DEG * Math.PI) / 180;
	state.splitActive = true;
	state.splitEndsAt = Math.max(state.splitEndsAt, state.clock + SPLIT_DURATION_SEC);
	if (state.balls.length === 0)
	{
		return ;
	}
	const canAdd = Math.max(0, MAX_BALLS_ON_FIELD - state.balls.length);
	const toAdd = Math.min(SPLIT_SPAWN_PER_PICKUP, canAdd);
	if (toAdd <= 0)
	{
		return;
	}
	const src = fromBall ?? state.balls[0];
	const speed = Math.max(1e-6, length2(src.vx, src.vy));
	const base = Math.atan2(src.vy, src.vx);

	const makeAtAngle = (angle : number): Ball => ({
		...src,
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		lastPaddleHit: src.lastPaddleHit
	});

	for (let i = 0; i < toAdd; i++)
	{
		const offset = (Math.random() * 2 - 1) * spreadRad;
		state.balls.push(makeAtAngle(base + offset));
	}
};

export const endSplit = (state: GameState) => {
	state.splitActive = false;
	if (state.balls.length > 1)
	{
		let keep = 0;
		let best = -Infinity;
		for (let i = 0; i < state.balls.length; i++)
		{
			const k = Math.abs(state.balls[i].vx);
			if (k > best)
			{
				best = k;
				keep = i;
			}
		}
		state.balls = [state.balls[keep]];
		scheduleNextPowerUp(state);
	}
};

export const activateBlackout = (state: GameState, ball: Ball) => {
	const lastHit = ball.lastPaddleHit || (ball.vx >= 0 ? 'left' : 'right');

	if (lastHit === 'left')
	{
		state.blackoutRight = true;
		state.blackoutRightEndsAt = state.clock + BLACKOUT_DURATION_SEC;
		state.blackoutRightIntensity = 0;
	}
	else if (lastHit === 'right')
	{
		state.blackoutLeft = true;
		state.blackoutLeftEndsAt = state.clock + BLACKOUT_DURATION_SEC;
		state.blackoutLeftIntensity = 0;
	}
};

export const updateBlackout = (state: GameState, dt: number) => {
	if (state.blackoutLeft) 
	{
		const timeRemaining = state.blackoutLeftEndsAt - state.clock;
		if (timeRemaining <= 0)
		{
			state.blackoutLeftIntensity = Math.max(0, state.blackoutLeftIntensity - (dt / BLACKOUT_FADE_DURATION_SEC));
			if (state.blackoutLeftIntensity <= 0)
			{
				state.blackoutLeft = false;
				state.blackoutLeftIntensity = 0;
			}
		}
		else if (timeRemaining > BLACKOUT_DURATION_SEC - BLACKOUT_FADE_DURATION_SEC)
		{
				const fadeProgress = (BLACKOUT_DURATION_SEC - timeRemaining) / BLACKOUT_FADE_DURATION_SEC;
				state.blackoutLeftIntensity = Math.min(1, fadeProgress);
		}
		else if (timeRemaining <= BLACKOUT_FADE_DURATION_SEC) 
		{
			state.blackoutLeftIntensity = 1;
		}
		else
		{
				state.blackoutLeftIntensity = 1;
		}
	}
	if (state.blackoutRight) 
	{
		const timeRemaining = state.blackoutRightEndsAt - state.clock;
		
		if (timeRemaining <= 0) 
		{
			state.blackoutRightIntensity = Math.max(0, state.blackoutRightIntensity - (dt / BLACKOUT_FADE_DURATION_SEC));
			
			if (state.blackoutRightIntensity <= 0) {
				state.blackoutRight = false;
				state.blackoutRightIntensity = 0;
			}
		} 
		else if (timeRemaining > BLACKOUT_DURATION_SEC - BLACKOUT_FADE_DURATION_SEC) 
		{
			const fadeProgress = (BLACKOUT_DURATION_SEC - timeRemaining) / BLACKOUT_FADE_DURATION_SEC;
			state.blackoutRightIntensity = Math.min(1, fadeProgress);
		} 
		else if (timeRemaining <= BLACKOUT_FADE_DURATION_SEC) 
		{
			state.blackoutRightIntensity = 1;
		} 
		else 
		{
			state.blackoutRightIntensity = 1;
		}
	}

};

export const activateBlackhole = (state: GameState) => {
	state.blackholeActive = true;
	state.blackholeStartAt = state.clock;
	state.blackholeEndsAt = state.clock + BLACKHOLE_DURATION_SEC;
	state.blackholeCenterX = WORLD_WIDTH / 2;
	state.blackholeCenterY = WORLD_HEIGHT / 2;
	for (const b of state.balls)
	{
		const sp = Math.max(1e-6, Math.hypot(b.vx, b.vy));
		b.bhSpeed = sp > 1e-6 ? sp : BALL_INITIAL_SPEED;
	}
};

export const updateBlackhole = (state: GameState, dt: number) => {
	if (!state.blackholeActive)
	{
		return;
	}

	const cx = state.blackholeCenterX;
	const cy = state.blackholeCenterY;
	const progress = Math.max(0, Math.min(1, 1 - (state.blackholeEndsAt - state.clock) / BLACKHOLE_DURATION_SEC));
	const pull = BLACKHOLE_PULL * (0.6 + 0.8 * progress);
	const swirl = BLACKHOLE_SWIRL * (0.6 + 0.8 * progress);

	for (const b of state.balls)
	{
		if (b.bhSpeed === undefined)
		{
			const sp0 = Math.max(1e-6, Math.hypot(b.vx, b.vy));
			b.bhSpeed = sp0 > 1e-6 ? sp0 : BALL_INITIAL_SPEED;
		}
		const dx = cx - b.x;
		const dy = cy - b.y;
		const dist = Math.max(1e-3, Math.hypot(dx, dy));
		const nx = dx / dist;
		const ny = dy / dist;

		const tx = -ny;
		const ty = nx;

		const ax = nx * pull + tx * swirl;
		const ay = ny * pull + ty * swirl;

		b.vx += ax * dt;
		b.vy += ay * dt;

		const target = b.bhSpeed!;
		const cur = Math.max(1e-6, Math.hypot(b.vx, b.vy));
		const k = target / cur;
		b.vx *= k;
		b.vy *= k;
	}
	if (state.clock >= state.blackholeEndsAt)
	{
		endBlackhole(state);
	}
};

export const endBlackhole = (state: GameState) => {
	for (const b of state.balls)
	{
		delete b.bhSpeed;
	}
	state.blackholeActive = false;
	scheduleNextPowerUp(state);
}