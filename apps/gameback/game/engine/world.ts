import { 
	WORLD_WIDTH, WORLD_HEIGHT, PADDLE_MARGIN, PADDLE_HEIGHT, PADDLE_SPEED,
	PADDLE_SPEED_INCREASE, BALL_INITIAL_SPEED, BALL_SPEED_INCREASE, BALL_MAX_SPEED,
	BALL_RADIUS, SCORE_TO_WIN, PADDLE_MAX_SPEED, SMASH_ANIM_DURATION, SMASH_COOLDOWN,
	SMASH_SPEED_MULTIPLIER, SMASH_TIMING_WINDOW,
	PADDLE_WIDTH} from "./constants";
import type { Ball, GameState, Side } from "./types";
import { clamp } from "./helpers";
import { bounceOnWalls, checkPaddleCollision, resolveBallBallCollision } from "./physics";
import { activateSplit, endSplit, pruneExpiredPowerUps, scheduleNextPowerUp, spawnPowerUp } from "./powerups";
import type { PublicState } from "../ws/messageTypes";

const newBall = (vx: number, vy: number): Ball => ({
	x: WORLD_WIDTH / 2,
	y: WORLD_HEIGHT / 2,
	vx,
	vy,
	radius: BALL_RADIUS,
	lastPaddleHit: ''
});

export class GameWorld {
	state: GameState;

	constructor() {
		this.state = this._freshState();
	}

	private _freshState(): GameState {
		return {
			leftPaddle: {speed: PADDLE_SPEED, y: WORLD_HEIGHT / 2, intention: 0},
			rightPaddle: {speed: PADDLE_SPEED, y: WORLD_HEIGHT / 2, intention: 0},
			balls: [newBall(Math.random() < 0.5 ? -BALL_INITIAL_SPEED : BALL_INITIAL_SPEED, 0)],
			score: {left: 0, right: 0},
			isPaused: false,
			isGameOver: false,
            isTimeoutLeft: false,
            isTimeoutRight: false,
            isTimeoutBoth: false,
			winner: '',
			clock: 0,
			countdownValue: 0,
			countdownTimer: 0,
			powerUps: [],
			nextPowerUpAt: 5 + Math.random() * 10,
			splitActive: false,
			splitEndsAt: 0,
			smash : {
				left: {availableAt: 0, lastPressAt: -1e9, lastSmashAt: -1e9},
				right: {availableAt: 0, lastPressAt: -1e9, lastSmashAt: -1e9}
			}
		};
	}

	applyInput(side: 'left' | 'right', intention: -1 | 0 | 1) {
		(side === 'left' ? this.state.leftPaddle : this.state.rightPaddle).intention = intention;
	}

	pressSmash(side: Side)
	{
		const sm = this.state.smash[side];
        if (this.state.clock >= sm.availableAt)
        {
            sm.lastSmashAt = this.state.clock;
            sm.availableAt = this.state.clock + SMASH_COOLDOWN;
            sm.lastPressAt = this.state.clock;
        }
	}

	startCountdown() {
		this.state.countdownValue = 3;
		this.state.countdownTimer = 0;
		this.state.isPaused = true;
	}

	pause() {
		if (this.state.countdownValue === 0)
		{
			this.state.isPaused = true;
		}
	}
	
	resume() {
		if (this.state.countdownValue === 0)
		{
			this.startCountdown();
		}
	}

	restart() {
		this.state = this._freshState();
		this.startCountdown();
	}

	update(dt: number) {
		const s = this.state;

		if (s.countdownValue > 0)
		{
			s.countdownTimer += dt;
			if (s.countdownTimer >= 1)
			{
				s.countdownValue--;
				s.countdownTimer = 0;
				if (s.countdownValue <= 0)
				{
					s.isPaused = false;
				}
			}
			return;
		}
		if (s.isPaused || s.isGameOver)
		{
			return;
		}
		s.clock += dt;

		s.leftPaddle.y = clamp(s.leftPaddle.y + s.leftPaddle.intention * s.leftPaddle.speed * dt,
			PADDLE_HEIGHT / 2, WORLD_HEIGHT - PADDLE_HEIGHT / 2);
		s.rightPaddle.y = clamp(s.rightPaddle.y + s.rightPaddle.intention * s.rightPaddle.speed * dt,
			PADDLE_HEIGHT / 2, WORLD_HEIGHT - PADDLE_HEIGHT / 2);
		
		if (s.clock >= s.nextPowerUpAt)
		{
			spawnPowerUp(s);
			scheduleNextPowerUp(s);
		}

		pruneExpiredPowerUps(s);

		const leftX = PADDLE_MARGIN;
		const rightX = WORLD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;

		for (let i = s.powerUps.length - 1; i >= 0; i--)
		{
			const pu = s.powerUps[i];
			let picked = false;
			for (const b of s.balls)
			{
				const dx = b.x - pu.x;
				const dy = b.y - pu.y;
				if (Math.hypot(dx, dy) <= b.radius + pu.radius)
				{
					s.powerUps.splice(i, 1);
					activateSplit(s, b);
					picked = true;
					break;
				}
			}
			if (picked)
			{
				continue;
			}
		}

		for (const b of s.balls)
		{
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			bounceOnWalls(b);
			if (b.lastPaddleHit === 'left' && b.x - b.radius > leftX + PADDLE_WIDTH + 2)
			{
				b.lastPaddleHit = '';
			}
			if (b.lastPaddleHit === 'right' && b.x + b.radius < rightX - 2)
			{
				b.lastPaddleHit = '';
			}
			const hitL = checkPaddleCollision(b, leftX, s.leftPaddle.y, true);
			const hitR = checkPaddleCollision(b, rightX, s.rightPaddle.y, false);
			if (hitL || hitR)
			{
				const curr = Math.max(1e-6, Math.hypot(b.vx, b.vy));
				let target = Math.min(curr * BALL_SPEED_INCREASE, BALL_MAX_SPEED);

				const side: Side | '' = hitL ? 'left' : hitR ? 'right' : '';
				if (side)
				{
					const sm = s.smash[side];
					const smashRecent = (s.clock - sm.lastSmashAt) <= SMASH_TIMING_WINDOW;
					if (smashRecent)
					{
						target = Math.min(target * SMASH_SPEED_MULTIPLIER, BALL_MAX_SPEED);
					}
				}

				const norm = Math.max(1e-6, Math.hypot(b.vx, b.vy));
				const k = target / norm;
				b.vx *= k;
				b.vy *= k;
				s.leftPaddle.speed = Math.min(s.leftPaddle.speed * PADDLE_SPEED_INCREASE, PADDLE_MAX_SPEED);
				s.rightPaddle.speed = Math.min(s.rightPaddle.speed * PADDLE_SPEED_INCREASE, PADDLE_MAX_SPEED);
			}
		}
		if (s.balls.length > 1)
		{
			for (let i = 0; i < s.balls.length; i++)
			{
				for (let j = i + 1; j < s.balls.length; j++)
				{
					resolveBallBallCollision(s.balls[i], s.balls[j]);
				}
			}
		}
		if (s.splitActive && s.clock >= s.splitEndsAt)
		{
			endSplit(s);
		}
		const removed: number[] = [];
		for (let i = 0; i < s.balls.length; i++)
		{
			const b = s.balls[i];
			if (b.x + b.radius <= 0)
			{
				s.score.right++;
				removed.push(i);
			}
			else if (b.x - b.radius >= WORLD_WIDTH)
			{
				s.score.left++;
				removed.push(i);
			}
		}
		for (let i = removed.length - 1; i >= 0; i--)
		{
			s.balls.splice(removed[i], 1);
		}
		if (s.score.left >= SCORE_TO_WIN || s.score.right >= SCORE_TO_WIN)
		{
			s.isGameOver = true;
			s.isPaused = true;
			s.winner = s.score.left >= SCORE_TO_WIN ? 'left' : 'right';
			return;
		}
		if (s.balls.length === 0)
		{
			s.balls = [newBall((Math.random() < 0.5 ? -1 : 1) * BALL_INITIAL_SPEED, 0)];
			s.leftPaddle.speed = PADDLE_SPEED;
			s.rightPaddle.speed = PADDLE_SPEED;
			s.splitActive = false;
			s.splitEndsAt = 0;
			scheduleNextPowerUp(s);
		}
	}

	publicState(): PublicState {
		const s = this.state;
		return {
			leftPaddle: {...s.leftPaddle},
			rightPaddle: {...s.rightPaddle},
			balls: s.balls.map(({x, y, vx, vy, radius}) => ({x, y, vx, vy, radius})),
			score: {...s.score},
			isPaused: s.isPaused,
			isGameOver: s.isGameOver,
            isTimeoutLeft: s.isTimeoutLeft,
            isTimeoutRight: s.isTimeoutRight,
            isTimeoutBoth: s.isTimeoutBoth,
			winner: s.winner,
			countdownValue: s.countdownValue,
			powerUps: s.powerUps.map(({x, y, radius}) => ({x, y, radius})),
			splitActive: s.splitActive,
			clock: s.clock,
			smash: {
				cooldown: SMASH_COOLDOWN,
				animDuration: SMASH_ANIM_DURATION,
				left: {
					cooldownRemaining: Math.max(0, s.smash.left.availableAt - s.clock),
					lastSmashAt: s.smash.left.lastSmashAt
				},
				right: {
					cooldownRemaining: Math.max(0, s.smash.right.availableAt - s.clock),
					lastSmashAt: s.smash.right.lastSmashAt
				}
			}
		};
	}
}