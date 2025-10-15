import { 
	WORLD_WIDTH, WORLD_HEIGHT, PADDLE_MARGIN, PADDLE_HEIGHT, PADDLE_SPEED,
	PADDLE_SPEED_INCREASE, BALL_INITIAL_SPEED, BALL_SPEED_INCREASE, BALL_MAX_SPEED,
	BALL_RADIUS, SCORE_TO_WIN, PADDLE_MAX_SPEED, SMASH_ANIM_DURATION, SMASH_COOLDOWN,
	SMASH_SPEED_MULTIPLIER, SMASH_TIMING_WINDOW,
	PADDLE_WIDTH, MAX_BALLS_ON_FIELD} from "./constants";
import type { Ball, GameState, Side } from "./types";
import { clamp } from "./helpers";
import { bounceOnWalls, checkPaddleCollision, resolveBallBallCollision } from "./physics";
import { activateSplit, endSplit, pruneExpiredPowerUps, scheduleNextPowerUp, spawnPowerUp,
	activateBlackout, updateBlackout, activateBlackhole, updateBlackhole, endBlackhole } from "./powerups";
import type { PublicState } from "../ws/messageTypes";

const newBall = (vx: number, vy: number): Ball => ({
	x: WORLD_WIDTH / 2,
	y: WORLD_HEIGHT / 2,
	vx,
	vy,
	radius: BALL_RADIUS,
	lastPaddleHit: ''
});

export interface GameEventCallbacks {
	onPaddleHit?: (side: 'left' | 'right') => void;
	onPowerUpCollected?: (side: 'left' | 'right', type: 'split' | 'blackout' | 'blackhole', gameTime: number) => void;
	onBallSpeedUpdate?: (speed: number) => void;
	onSmashSuccess?: (side: 'left' | 'right', gameTime: number) => void;
	onGoalScored?: (scorerSide: 'left' | 'right', ballYPosition: number, gameTime: number) => void;
}

export class GameWorld {
	state: GameState;
	callbacks: GameEventCallbacks = {};

	constructor() {
		this.state = this._freshState();
	}

	setCallbacks(callbacks: GameEventCallbacks) {
		this.callbacks = callbacks;
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
			winner: '',
			clock: 0,
			countdownValue: 0,
			countdownTimer: 0,
			powerUps: [],
			nextPowerUpAt: 5 + Math.random() * 10,
			splitActive: false,
			splitEndsAt: 0,
			blackoutLeft: false,
			blackoutRight: false,
			blackoutLeftEndsAt: 0,
			blackoutRightEndsAt: 0,
			blackoutLeftIntensity: 0,
			blackoutRightIntensity: 0,
			blackholeActive: false,
			blackholeStartAt: 0,
			blackholeEndsAt: 0,
			blackholeCenterX: WORLD_WIDTH / 2,
			blackholeCenterY: WORLD_HEIGHT / 2,
			smash : {
				left: {availableAt: 0, lastPressAt: -1e9, lastSmashAt: -1e9},
				right: {availableAt: 0, lastPressAt: -1e9, lastSmashAt: -1e9}
			}
		};
	}

	applyInput(side: 'left' | 'right', intention: -1 | 0 | 1) {
		(side === 'left' ? this.state.leftPaddle : this.state.rightPaddle).intention = intention;
	}

	pressSmash(side: Side): boolean
	{
		const sm = this.state.smash[side];
        if (this.state.clock >= sm.availableAt)
        {
            sm.lastSmashAt = this.state.clock;
            sm.availableAt = this.state.clock + SMASH_COOLDOWN;
            sm.lastPressAt = this.state.clock;
			return true; // Smash activé
        }
		return false; // En cooldown
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
		updateBlackout(s, dt);
		updateBlackhole(s, dt);
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
					
					const side: 'left' | 'right' = b.lastPaddleHit === 'left' ? 'left' : 
												  b.lastPaddleHit === 'right' ? 'right' :
												  b.x < WORLD_WIDTH / 2 ? 'left' : 'right';
					
					this.callbacks.onPowerUpCollected?.(side, pu.type, s.clock);
					
					if (pu.type === 'split')
					{
						activateSplit(s, b);
					}
					else if (pu.type === 'blackout')
					{
						activateBlackout(s, b);
					}
					else if (pu.type === 'blackhole')
					{
						activateBlackhole(s);
					}
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
				if (hitL) this.callbacks.onPaddleHit?.('left');
				if (hitR) this.callbacks.onPaddleHit?.('right');
				
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
						this.callbacks.onSmashSuccess?.(side, s.clock);
					}
				}

				const norm = Math.max(1e-6, Math.hypot(b.vx, b.vy));
				const k = target / norm;
				b.vx *= k;
				b.vy *= k;
				
				this.callbacks.onBallSpeedUpdate?.(target);
				
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
				// Notifier le goal marqué par le joueur de droite
				this.callbacks.onGoalScored?.('right', b.y, s.clock);
			}
			else if (b.x - b.radius >= WORLD_WIDTH)
			{
				s.score.left++;
				removed.push(i);
				// Notifier le goal marqué par le joueur de gauche
				this.callbacks.onGoalScored?.('left', b.y, s.clock);
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

    public debugActivatePowerUp(kind: 'split' | 'blackout' | 'blackhole'): void {
        switch (kind) {
            case 'split':
                activateSplit(this.state);
                break;
            case 'blackout': {
                const b = this.state.balls[0];
                if (!b) return;
                if (!b.lastPaddleHit) 
                {
                    b.lastPaddleHit = 'left';
                }
                activateBlackout(this.state, b);
                break;
            }
            case 'blackhole':
                activateBlackhole(this.state);
                break;
        }
    }

    public debugClearPowerUps(): void {
        const s = this.state;
        s.powerUps = [];
        s.splitActive = false;
        s.splitEndsAt = 0;
        s.blackoutLeft = false;
        s.blackoutRight = false;
        s.blackoutLeftEndsAt = 0;
        s.blackoutRightEndsAt = 0;
        s.blackoutLeftIntensity = 0;
        s.blackoutRightIntensity = 0;
        if (s.blackholeActive) {
        endBlackhole(s);
        }
    }

    public debugChangeScore(side: 'left' | 'right', amount: number): void {
        const s = this.state;
        s.score[side] = Math.max(0, s.score[side] + amount);
        if (s.score.left >= SCORE_TO_WIN || s.score.right >= SCORE_TO_WIN) {
        s.isGameOver = true;
        s.isPaused = true;
        s.winner = s.score.left >= SCORE_TO_WIN ? 'left' : 'right';
        }
    }

    public debugResetScore(): void {
        const s = this.state;
        s.score.left = 0;
        s.score.right = 0;
        s.isGameOver = false;
        s.winner = '';
        s.isPaused = false;
    }

     public debugSetScore(left: number, right: number): void {
        const s = this.state;
        s.score.left = Math.max(0, left);
        s.score.right = Math.max(0, right);
        if (s.score.left >= SCORE_TO_WIN || s.score.right >= SCORE_TO_WIN) {
        s.isGameOver = true;
        s.isPaused = true;
        s.winner = s.score.left >= SCORE_TO_WIN ? 'left' : 'right';
        }
    }

    public debugBallControl(mode: 'add' | 'remove' | 'reset'): void {
        const s = this.state;
        switch (mode) {
        case 'add':
            if (s.balls.length < MAX_BALLS_ON_FIELD) {
            s.balls.push({
                x: WORLD_WIDTH / 2,
                y: WORLD_HEIGHT / 2,
                vx: (Math.random() < 0.5 ? -1 : 1) * BALL_INITIAL_SPEED,
                vy: (Math.random() - 0.5) * 200,
                radius: BALL_RADIUS,
                lastPaddleHit: ''
            });
            }
            break;
        case 'remove':
            if (s.balls.length > 1) {
            s.balls.pop();
            }
            break;
        case 'reset':
            s.balls = [{
            x: WORLD_WIDTH / 2,
            y: WORLD_HEIGHT / 2,
            vx: BALL_INITIAL_SPEED,
            vy: 0,
            radius: BALL_RADIUS,
            lastPaddleHit: ''
            }];
            break;
        }
    }

    private frozenVelocities: Map<number, { vx: number; vy: number }> = new Map();
    private isFrozen: boolean = false;

    public debugBallSpeed(mode: 'multiply' | 'divide' | 'freeze'): void {
        const s = this.state;
        
        if (mode === 'freeze') {
            if (!this.isFrozen) {
                this.frozenVelocities.clear();
                for (let i = 0; i < s.balls.length; i++) {
                    const b = s.balls[i];
                    this.frozenVelocities.set(i, { vx: b.vx, vy: b.vy });
                    b.vx = 0;
                    b.vy = 0;
                }
                this.isFrozen = true;
            } else {
                for (let i = 0; i < s.balls.length; i++) {
                    const b = s.balls[i];
                    const saved = this.frozenVelocities.get(i);
                    if (saved) {
                        b.vx = saved.vx;
                        b.vy = saved.vy;
                    }
                }
                this.frozenVelocities.clear();
                this.isFrozen = false;
            }
            return;
        }
        
        for (const b of s.balls) {
            const factor = mode === 'multiply' ? 2 : 0.5;
            b.vx *= factor;
            b.vy *= factor;
            const sp = Math.max(1e-6, Math.hypot(b.vx, b.vy));
            if (sp > BALL_MAX_SPEED) {
                const k = BALL_MAX_SPEED / sp;
                b.vx *= k;
                b.vy *= k;
            }
        }
    }

	publicState(): PublicState {
		const s = this.state;
		const progress = s.blackholeActive ? 
		Math.max(0, Math.min(1, 1 - (s.blackholeEndsAt - s.clock) / Math.max(1e-6, (s.blackholeEndsAt - s.blackholeStartAt)))) 
		: 0;
		return {
			leftPaddle: {...s.leftPaddle},
			rightPaddle: {...s.rightPaddle},
			balls: s.balls.map(({x, y, vx, vy, radius}) => ({x, y, vx, vy, radius})),
			score: {...s.score},
			isPaused: s.isPaused,
			isGameOver: s.isGameOver,
            isTimeoutLeft: s.isTimeoutLeft,
            isTimeoutRight: s.isTimeoutRight,
			winner: s.winner,
			countdownValue: s.countdownValue,
			powerUps: s.powerUps.map(({x, y, radius, type}) => ({x, y, radius, type})),
			splitActive: s.splitActive,
			clock: s.clock,
			blackoutLeft: s.blackoutLeft,
			blackoutRight: s.blackoutRight,
			blackoutLeftIntensity: s.blackoutLeftIntensity,
			blackoutRightIntensity: s.blackoutRightIntensity,
			blackholeActive: s.blackholeActive,
			blackholeProgress: progress,
			blackholeCenterX: s.blackholeCenterX,
			blackholeCenterY: s.blackholeCenterY,
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
