import type { ViewFunction } from "../router/types";
import { 
	Button,
	BackButton
 } from "../components/Button";

export const GameView: ViewFunction = () => {
	return `
		${BackButton()}
		<div class="container ml-auto mr-auto flex flex-col items-center">
			<canvas id="pong-canvas"></canvas>
			${Button({
				children: "Start",
				variant: "danger",
				size: "lg",
				className: "font-bold ",
				id: "startBtn",
			})}
		</div>
	`;
};

export const gameLogic = () => {
	const DEBUG = true;
	
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
	const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

	if (!canvas) {
		console.log('Canvas not found');
		return () => {};
	}
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		console.error('No 2d ctx');
		return () => {};
	}

	if (DEBUG) console.log("[INIT] Canvas loaded");
	
	const WORLD_WIDTH = 1920;
	const WORLD_HEIGHT = 1080;

	const PADDLE_WIDTH = 15;
	const PADDLE_HEIGHT = 100;
	const PADDLE_SPEED_INCREASE = 1.05;
	const PADDLE_SPEED = 400;
	const PADDLE_MARGIN = 30;

	const BALL_RADIUS = 30;
	const BALL_INITIAL_SPEED = 500;
	const BALL_SPEED_INCREASE = 1.1;
	const BALL_MAX_SPEED = 1500;
	const MAX_BOUNCE_DEG = 45;

	const SCORE_TO_WIN = 11;

	const POWERUP_RADIUS = 35;
	const POWERUP_MIN_DELAY_SEC = 5;
	const POWERUP_EXTRA_RANDOM_SEC = 10;
	const POWERUP_LIFETIME_SEC = 1000;
	const SPLIT_DURATION_SEC = 100;

	type Side = '' | 'left' | 'right';

	type Ball = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		radius: number;
		lastPaddleHit: Side;
	};

	type PowerUp = {
		visible: boolean;
		x: number;
		y: number;
		radius: number;
		spawnAt: number;
		expiresAt: number;
	};

	const newBall = (vx: number, vy: number): Ball => ({
		x: WORLD_WIDTH / 2,
		y: WORLD_HEIGHT / 2,
		vx,
		vy,
		radius: BALL_RADIUS,
		lastPaddleHit: ''
	});

	const scheduleAfter = (now: number, min: number, rand: number) =>
		now + min + Math.random() * rand;

	const length2 = (x: number, y: number) => Math.sqrt(x*x + y*y);

	const gameState = {
		leftPaddle: {
			speed: PADDLE_SPEED,
			y: WORLD_HEIGHT / 2,
			intention: 0
		},
		
		rightPaddle: {
			speed: PADDLE_SPEED,
			y: WORLD_HEIGHT / 2,
			intention: 0
		},

		balls: [newBall(BALL_INITIAL_SPEED, 0)],

		score: {
			left: 0,
			right: 0
		},

		isPlaying: false,
		isPaused: false,
		isGameOver: false as boolean,
		winner: '' as '' | 'Left' | 'Right',
	
		clock: 0,
		countdownValue: 0,
		countdownTimer: 0,

		powerUp: {
			visible: false,
			x: 0,
			y: 0,
			radius: POWERUP_RADIUS,
			spawnAt: POWERUP_MIN_DELAY_SEC + Math.random() * POWERUP_EXTRA_RANDOM_SEC,
			expiresAt: 0
		} as PowerUp,

		splitActive: false,
		splitEndsAt: 0
	};

	const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

	const startCountdown = () => {
		if (DEBUG) console.log("[GAME] Starting countdown");
		gameState.countdownValue = 3;
		gameState.countdownTimer = 0;
		gameState.isPaused = true;
	};

	const setupCanvas = () => {
		const container = canvas.parentElement;
		if (!container) return;

		const containerWidth = container.clientWidth * 0.9;
		const containerHeight = window.innerHeight * 0.8;

		const scaleX = containerWidth / WORLD_WIDTH;
		const scaleY = containerHeight / WORLD_HEIGHT;
		const scale = Math.min(scaleX, scaleY);

		const displayWidth = Math.floor(WORLD_WIDTH * scale);
		const displayHeight = Math.floor(WORLD_HEIGHT * scale);

		const dpr = window.devicePixelRatio || 1;
		canvas.width = WORLD_WIDTH * dpr;
		canvas.height = WORLD_HEIGHT * dpr;

		ctx.resetTransform();
		ctx.scale(dpr, dpr);

		canvas.style.width = displayWidth + 'px';
		canvas.style.height = displayHeight + 'px';

		canvas.style.display = 'block';
		canvas.style.margin = '20px auto';
		canvas.style.border = '2px solid #333';
		
		if (DEBUG) console.log(`[CANVAS] Setup: ${displayWidth}x${displayHeight}, DPR: ${dpr}`);
	};

	setupCanvas();

	const scheduleNextPowerUp = () => {
		gameState.powerUp.visible = false;
		gameState.powerUp.expiresAt = 0;
		gameState.powerUp.spawnAt = scheduleAfter(gameState.clock, POWERUP_MIN_DELAY_SEC, POWERUP_EXTRA_RANDOM_SEC);
	};

	const spawnPowerUp = () => {
		const margin = 150;
		gameState.powerUp.x = margin + Math.random() * (WORLD_WIDTH - 2 * margin);
		gameState.powerUp.y = margin + Math.random() * (WORLD_HEIGHT - 2 * margin);
		gameState.powerUp.visible = true;
		gameState.powerUp.expiresAt = gameState.clock + POWERUP_LIFETIME_SEC;
	};

	const activateSplit = () => {
		if (gameState.splitActive) return;
		if (gameState.balls.length !== 1) return;

		const b = gameState.balls[0];
		const speed = Math.max(1e-6, length2(b.vx, b.vy));
		const baseAngle = Math.atan2(b.vy, b.vx);
		const spread = Math.PI / 8;

		const aAngle = baseAngle - spread;
		const bAngle = baseAngle + spread;

		const ballA: Ball = { ...b, vx: Math.cos(aAngle) * speed, vy: Math.sin(aAngle) * speed, lastPaddleHit: b.lastPaddleHit };
		const ballB: Ball = { ...b, vx: Math.cos(bAngle) * speed, vy: Math.sin(bAngle) * speed, lastPaddleHit: b.lastPaddleHit };

		gameState.balls = [ballA, ballB];
		gameState.splitActive = true;
		gameState.splitEndsAt = gameState.clock + SPLIT_DURATION_SEC;
	};

	const endSplit = () => {
		gameState.splitActive = false;
		if (gameState.balls.length > 1) {
			let keepIndex = 0;
			let best = -Infinity;
			for (let i = 0; i < gameState.balls.length; i++) {
				const k = Math.abs(gameState.balls[i].vx);
				if (k > best) { best = k; keepIndex = i; }
			}
			gameState.balls = [gameState.balls[keepIndex]];
		}
		scheduleNextPowerUp();
	};

	const resetAfterScore = (serveToLeft: boolean) => {
		gameState.balls = [newBall((serveToLeft ? -1 : 1) * BALL_INITIAL_SPEED, 0)];
		gameState.leftPaddle.speed = PADDLE_SPEED;
		gameState.rightPaddle.speed = PADDLE_SPEED;
		gameState.splitActive = false;
		gameState.splitEndsAt = 0;
		scheduleNextPowerUp();
		//startCountdown();
	};

	const restartGame = () => {
		gameState.score.left = 0;
		gameState.score.right = 0;
		gameState.isGameOver = false;
		gameState.winner = '';
		gameState.leftPaddle.y = WORLD_HEIGHT / 2;
		gameState.rightPaddle.y = WORLD_HEIGHT / 2;
		gameState.leftPaddle.speed = PADDLE_SPEED;
		gameState.rightPaddle.speed = PADDLE_SPEED;

		gameState.balls = [newBall(Math.random() < 0.5 ? -BALL_INITIAL_SPEED : BALL_INITIAL_SPEED, 0)];

		gameState.clock = 0;
		gameState.isPaused = false;
		gameState.splitActive = false;
		gameState.splitEndsAt = 0;
		gameState.powerUp.visible = false;
		gameState.powerUp.expiresAt = 0;
		gameState.powerUp.spawnAt = POWERUP_MIN_DELAY_SEC + Math.random() * POWERUP_EXTRA_RANDOM_SEC;

		startBtn.classList.add('hidden');
		startCountdown();
	};

	const handleResize = () => {
		if (DEBUG) console.log("[CANVAS] Window resized");
		setupCanvas();
		render();
	};
	window.addEventListener('resize', handleResize);

	const keys = {
		w: false,
		s: false,
		arrowUp: false,
		arrowDown: false,
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		switch(e.key) {
			case 'w':
			case 'W':
				keys.w = true;
				if (DEBUG) console.log("[INPUT] W pressed");
				break;
			case 's':
			case 'S':
				keys.s = true;
				if (DEBUG) console.log("[INPUT] S pressed");
				break;
			case 'ArrowUp':
				keys.arrowUp = true;
				e.preventDefault();
				if (DEBUG) console.log("[INPUT] ArrowUp pressed");
				break;
			case 'ArrowDown':
				keys.arrowDown = true;
				e.preventDefault();
				if (DEBUG) console.log("[INPUT] ArrowDown pressed");
				break;
			case 'p':
			case 'P':
			case ' ':
				if (gameState.countdownValue > 0) {
					if (DEBUG) console.log("[INPUT] Pause ignored - countdown active");
					break;
				}
				if (!gameState.isPaused) {
					gameState.isPaused = true;
					if (DEBUG) console.log("[GAME] Game paused");
				} else {
					if (DEBUG) console.log("[GAME] Resuming with countdown");
					startCountdown();
				}
				e.preventDefault();
				break;
			case 'Escape':
				if (gameState.countdownValue > 0) {
					if (DEBUG) console.log("[INPUT] Escape ignored - countdown active");
					break;
				}
				if (!gameState.isPaused) {
					gameState.isPaused = true;
					if (DEBUG) console.log("[GAME] Game paused via Escape");
				} else {
					if (DEBUG) console.log("[GAME] Resuming with countdown via Escape");
					startCountdown();
				}
				break;
		}

		updateIntentions();
	};

	const handleKeyUp = (e: KeyboardEvent) => {
		switch(e.key) {
			case 'w':
			case 'W':
				keys.w = false;
				if (DEBUG) console.log("[INPUT] W released");
				break;
			case 's':
			case 'S':
				keys.s = false;
				if (DEBUG) console.log("[INPUT] S released");
				break;
			case 'ArrowUp':
				keys.arrowUp = false;
				if (DEBUG) console.log("[INPUT] ArrowUp released");
				break;
			case 'ArrowDown':
				keys.arrowDown = false;
				if (DEBUG) console.log("[INPUT] ArrowDown released");
				break;
		}

		updateIntentions();
	};

	const updateIntentions = () => {
		const oldLeftIntention = gameState.leftPaddle.intention;
		const oldRightIntention = gameState.rightPaddle.intention;
		
		if (keys.w && !keys.s) {
			gameState.leftPaddle.intention = -1;
		} else if (keys.s && !keys.w) {
			gameState.leftPaddle.intention = 1;
		} else {
			gameState.leftPaddle.intention = 0;
		}

		if (keys.arrowUp && !keys.arrowDown) {
			gameState.rightPaddle.intention = -1;
		} else if (keys.arrowDown && !keys.arrowUp) {
			gameState.rightPaddle.intention = 1;
		} else {
			gameState.rightPaddle.intention = 0;
		}
		
		if (DEBUG && oldLeftIntention !== gameState.leftPaddle.intention) {
			console.log(`[PADDLE] Left intention: ${gameState.leftPaddle.intention}`);
		}
		if (DEBUG && oldRightIntention !== gameState.rightPaddle.intention) {
			console.log(`[PADDLE] Right intention: ${gameState.rightPaddle.intention}`);
		}
	};

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);

	let animationId: number | null = null;

	const checkPaddleCollision = (ball: Ball, paddleX: number, paddleY: number, isLeftPaddle: boolean) => {
		const paddleName: Side = isLeftPaddle ? 'left' : 'right';
		if (ball.lastPaddleHit === paddleName) return false;

		const rectLeft = paddleX;
		const rectRight = paddleX + PADDLE_WIDTH;
		const rectTop = paddleY - PADDLE_HEIGHT / 2;
		const rectBottom = paddleY + PADDLE_HEIGHT / 2;

		const bx = ball.x, by = ball.y;
		const cx = clamp(bx, rectLeft, rectRight);
		const cy = clamp(by, rectTop, rectBottom);

		let nx = bx - cx;
		let ny = by - cy;

		const r = ball.radius;
		const dist2 = nx * nx + ny * ny;
		if (dist2 > r * r) return false;

		let dist = Math.sqrt(dist2);
		if (dist === 0) {
			const midX = (rectLeft + rectRight) / 2;
			const midY = (rectTop + rectBottom) / 2;
			const penX = Math.min(Math.abs(bx - rectLeft), Math.abs(rectRight - bx));
			const penY = Math.min(Math.abs(by - rectTop), Math.abs(rectBottom - by));
			if (penX < penY) { nx = (bx < midX ? -1 : 1); ny = 0; }
			else { nx = 0; ny = (by < midY ? -1 : 1); }
			dist = 0;
		} else {
			nx /= dist; ny /= dist;
		}

		const penetration = r - dist + 0.01;
		ball.x += nx * penetration;
		ball.y += ny * penetration;

		const currentSpeed = Math.max(1e-6, Math.hypot(ball.vx, ball.vy));
		const targetSpeed = Math.min(currentSpeed * BALL_SPEED_INCREASE, BALL_MAX_SPEED);

		const vdotn = ball.vx * nx + ball.vy * ny;
		ball.vx = ball.vx - 2 * vdotn * nx;
		ball.vy = ball.vy - 2 * vdotn * ny;

		if (isLeftPaddle && ball.vx < 0) ball.vx = Math.abs(ball.vx);
		if (!isLeftPaddle && ball.vx > 0) ball.vx = -Math.abs(ball.vx);

		const MAX_BOUNCE_RAD = MAX_BOUNCE_DEG * Math.PI / 180;
		const MAX_RATIO = Math.tan(MAX_BOUNCE_RAD);

		if (Math.abs(ball.vx) < 1e-6) {
			ball.vx = (isLeftPaddle ? 1 : -1) * 1e-6;
		}
		const ratio = Math.abs(ball.vy / ball.vx);
		if (ratio > MAX_RATIO) {
			ball.vy = Math.sign(ball.vy || 1) * Math.abs(ball.vx) * MAX_RATIO;
		}

		const newNorm = Math.max(1e-6, Math.hypot(ball.vx, ball.vy));
		const speedRatio = targetSpeed / newNorm;
		ball.vx *= speedRatio;
		ball.vy *= speedRatio;

		gameState.leftPaddle.speed *= PADDLE_SPEED_INCREASE;
		gameState.rightPaddle.speed *= PADDLE_SPEED_INCREASE;
		ball.lastPaddleHit = paddleName;

		return true;
	};

	const resolveBallBallCollision = (a: Ball, b: Ball) => {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const dist = Math.max(1e-6, Math.hypot(dx, dy));
		const minDist = a.radius + b.radius;
		if (dist >= minDist) return;

		const nx = dx / dist;
		const ny = dy / dist;
		const tx = -ny;
		const ty = nx;

		const va_n = a.vx * nx + a.vy * ny;
		const va_t = a.vx * tx + a.vy * ty;
		const vb_n = b.vx * nx + b.vy * ny;
		const vb_t = b.vx * tx + b.vy * ty;

		const va_n_after = vb_n;
		const vb_n_after = va_n;

		a.vx = va_n_after * nx + va_t * tx;
		a.vy = va_n_after * ny + va_t * ty;
		b.vx = vb_n_after * nx + vb_t * tx;
		b.vy = vb_n_after * ny + vb_t * ty;

		const overlap = (minDist - dist) + 0.5;
		a.x -= nx * overlap * 0.5;
		a.y -= ny * overlap * 0.5;
		b.x += nx * overlap * 0.5;
		b.y += ny * overlap * 0.5;
	};

	const render = () => {
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

		ctx.strokeStyle = '#fff';
		ctx.setLineDash([10, 10]);
		ctx.beginPath();
		ctx.moveTo(WORLD_WIDTH / 2, 0);
		ctx.lineTo(WORLD_WIDTH / 2, WORLD_HEIGHT);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = '#fff';
		
		ctx.fillRect(
			PADDLE_MARGIN,
			gameState.leftPaddle.y - PADDLE_HEIGHT / 2,
			PADDLE_WIDTH,
			PADDLE_HEIGHT
		);

		ctx.fillRect(
			WORLD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
			gameState.rightPaddle.y - PADDLE_HEIGHT / 2,
			PADDLE_WIDTH,
			PADDLE_HEIGHT
		);

		if (gameState.powerUp.visible) {
			ctx.beginPath();
			ctx.fillStyle = '#ffcc00';
			ctx.arc(gameState.powerUp.x, gameState.powerUp.y, gameState.powerUp.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#333';
			ctx.lineWidth = 3;
			ctx.stroke();
		}

		ctx.fillStyle = '#fff';
		for (const b of gameState.balls) {
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = '#fff';
		ctx.font = '48px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(gameState.score.left.toString(), WORLD_WIDTH / 2 - 100, 60);
		ctx.fillText(gameState.score.right.toString(), WORLD_WIDTH / 2 + 100, 60);

		if (gameState.countdownValue > 0) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
			ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
			ctx.fillStyle = '#fff';
			ctx.font = '120px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(gameState.countdownValue.toString(), WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
		} else if (gameState.isGameOver) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
			ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
			ctx.fillStyle = '#fff';
			ctx.font = '72px monospace';
			ctx.textAlign = 'center';
			ctx.fillText('GAME OVER', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 40);
			ctx.font = '36px monospace';
			ctx.fillText(`${gameState.winner} wins`, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 10);
			ctx.font = '24px monospace';
			ctx.fillText('Click "Rejouer" to restart', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 60);
		} else if (gameState.isPaused) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
			ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
			ctx.fillStyle = '#fff';
			ctx.font = '72px monospace';
			ctx.textAlign = 'center';
			ctx.fillText('PAUSED', WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
			ctx.font = '24px monospace';
			ctx.fillText('Press P, SPACE or ESC to resume', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 60);
		}
	};

	const update = (deltaTime: number) => {
		deltaTime = Math.min(deltaTime, 1/30);

		if (gameState.countdownValue > 0) {
			gameState.countdownTimer += deltaTime;
			if (gameState.countdownTimer >= 1) {
				gameState.countdownValue--;
				gameState.countdownTimer = 0;
				if (DEBUG) console.log(`[COUNTDOWN] ${gameState.countdownValue}`);
				if (gameState.countdownValue <= 0) {
					gameState.isPaused = false;
					if (DEBUG) console.log("[GAME] Countdown finished - Game resumed");
				}
			}
			return;
		}

		if (gameState.isPaused || gameState.isGameOver) {
			return;
		}

		gameState.clock += deltaTime;

		gameState.leftPaddle.y += gameState.leftPaddle.intention * gameState.leftPaddle.speed * deltaTime;
		gameState.rightPaddle.y += gameState.rightPaddle.intention * gameState.rightPaddle.speed * deltaTime;

		const halfPaddle = PADDLE_HEIGHT / 2;
		gameState.leftPaddle.y = Math.max(halfPaddle, Math.min(WORLD_HEIGHT - halfPaddle, gameState.leftPaddle.y));
		gameState.rightPaddle.y = Math.max(halfPaddle, Math.min(WORLD_HEIGHT - halfPaddle, gameState.rightPaddle.y));

		if (!gameState.splitActive && !gameState.powerUp.visible && gameState.clock >= gameState.powerUp.spawnAt) {
			spawnPowerUp();
			if (DEBUG) console.log("[POWERUP] Spawn");
		} else if (gameState.powerUp.visible && gameState.clock >= gameState.powerUp.expiresAt) {
			if (DEBUG) console.log("[POWERUP] Expired");
			scheduleNextPowerUp();
		}

		const leftPaddleX = PADDLE_MARGIN;
		const rightPaddleX = WORLD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;

		for (const b of gameState.balls) {
			b.x += b.vx * deltaTime;
			b.y += b.vy * deltaTime;

			if (b.y - b.radius <= 0) {
				b.y = b.radius;
				b.vy = Math.abs(b.vy);
			}
			if (b.y + b.radius >= WORLD_HEIGHT) {
				b.y = WORLD_HEIGHT - b.radius;
				b.vy = -Math.abs(b.vy);
			}

			if (b.lastPaddleHit === 'left' && b.x - b.radius > leftPaddleX + PADDLE_WIDTH + 2) b.lastPaddleHit = '';
			if (b.lastPaddleHit === 'right' && b.x + b.radius < rightPaddleX - 2) b.lastPaddleHit = '';

			checkPaddleCollision(b, leftPaddleX, gameState.leftPaddle.y, true);
			checkPaddleCollision(b, rightPaddleX, gameState.rightPaddle.y, false);
		}

		if (gameState.balls.length > 1) {
			for (let i = 0; i < gameState.balls.length; i++) {
				for (let j = i + 1; j < gameState.balls.length; j++) {
					resolveBallBallCollision(gameState.balls[i], gameState.balls[j]);
				}
			}
		}

		if (gameState.powerUp.visible) {
			for (const b of gameState.balls) {
				const dx = b.x - gameState.powerUp.x;
				const dy = b.y - gameState.powerUp.y;
				const dist = Math.hypot(dx, dy);
				if (dist <= b.radius + gameState.powerUp.radius) {
					gameState.powerUp.visible = false;
					gameState.powerUp.expiresAt = 0;
					if (DEBUG) console.log("[POWERUP] Collected -> split");
					activateSplit();
					break;
				}
			}
		}

		if (gameState.splitActive && gameState.clock >= gameState.splitEndsAt) {
			if (DEBUG) console.log("[SPLIT] End");
			endSplit();
		}

		const toRemove: number[] = [];
		for (let i = 0; i < gameState.balls.length; i++) {
			const b = gameState.balls[i];
			if (b.x + b.radius <= 0) {
				gameState.score.right++;
				toRemove.push(i);
				if (DEBUG) console.log("[GOAL] Right scores");
			} else if (b.x - b.radius >= WORLD_WIDTH) {
				gameState.score.left++;
				toRemove.push(i);
				if (DEBUG) console.log("[GOAL] Left scores");
			}
		}

		for (let i = toRemove.length - 1; i >= 0; i--) {
			gameState.balls.splice(toRemove[i], 1);
		}

		if (gameState.score.left >= SCORE_TO_WIN || gameState.score.right >= SCORE_TO_WIN) {
			gameState.isGameOver = true;
			gameState.isPaused = true;
			gameState.winner = gameState.score.left >= SCORE_TO_WIN ? 'Left' : 'Right';
			startBtn.textContent = "Rejouer";
			startBtn.classList.remove("hidden");
			return;
		}

		if (gameState.balls.length === 0) {
			resetAfterScore(Math.random() < 0.5);
		}
	};

	let lastTime = performance.now();

	const gameLoop = (currentTime: number) => {
		const deltaTime = (currentTime - lastTime) / 1000;
		lastTime = currentTime;

		update(deltaTime);
		render();

		animationId = requestAnimationFrame(gameLoop);
	};

	render();

	startBtn.addEventListener("click", () => {
		if (gameState.isGameOver) {
			restartGame();
			return;
		}
		if (DEBUG) console.log("[GAME] Game started");
		gameState.isPlaying = true;
		startBtn.classList.add("hidden");
		startCountdown();
		if (animationId === null) {
			gameLoop(performance.now());
		}
	});

	return () => {
		if (DEBUG) console.log("[CLEANUP] Cleaning up game resources");
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
		window.removeEventListener('resize', handleResize);
		window.removeEventListener('keyup', handleKeyUp);
		window.removeEventListener('keydown', handleKeyDown);
	};
};
