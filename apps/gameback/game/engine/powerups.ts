import { WORLD_WIDTH, WORLD_HEIGHT, POWERUP_MIN_DELAY_SEC,
	POWERUP_EXTRA_RANDOM_SEC, POWERUP_LIFETIME_SEC, SPLIT_DURATION_SEC, 
	POWERUP_RADIUS,
	POWERUP_MAX_ON_SCREEN} from "./constants";
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
	const margin = 150;
	state.powerUps.push({
		id: PU_ID++,
		x: margin + Math.random() * (WORLD_WIDTH - 2 * margin),
		y: margin + Math.random() * (WORLD_HEIGHT - 2 * margin),
		radius: POWERUP_RADIUS,
		expiresAt: state.clock + POWERUP_LIFETIME_SEC
	});
};

export const pruneExpiredPowerUps = (state: GameState) => {
	state.powerUps = state.powerUps.filter(p => p.expiresAt > state.clock);
}

export const activateSplit = (state: GameState) => {
	if (state.splitActive)
	{
		state.splitEndsAt = Math.max(state.splitEndsAt, state.clock + SPLIT_DURATION_SEC);
		return;
	}

	if (state.balls.length !== 1)
	{
		return ;
	}


	const b = state.balls[0];
	const speed = Math.max(1e-6, length2(b.vx, b.vy));
	const base = Math.atan2(b.vy, b.vx);
	const spread = Math.PI / 8;

	const make = (angle: number): Ball => ({
		...b, 
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		lastPaddleHit: b.lastPaddleHit
	});
	state.balls = [make(base - spread), make(base + spread)];
	state.splitActive = true;
	state.splitEndsAt = state.clock + SPLIT_DURATION_SEC;
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