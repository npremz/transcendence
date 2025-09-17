import { PADDLE_HEIGHT, PADDLE_WIDTH, MAX_BOUNCE_DEG, WORLD_HEIGHT, BALL_MAX_SPEED } from "./constants";
import { clamp } from "./helpers";
import type { Ball } from "./types";

export const checkPaddleCollision = (
	ball: Ball,
	paddleX: number,
	paddleY: number,
	isLeftPaddle: boolean
): boolean => {
	const paddleName = isLeftPaddle ? 'left' : 'right';
	if (ball.lastPaddleHit === paddleName)
	{
		return false;
	}

	const speedBefore = Math.max(1e-6, Math.hypot(ball.vx, ball.vy));
	const rectLeft = paddleX;
	const rectRight = paddleX + PADDLE_WIDTH;
	const rectTop = paddleY - PADDLE_HEIGHT / 2;
	const rectBottom = paddleY + PADDLE_HEIGHT / 2;

	const cx = clamp(ball.x, rectLeft, rectRight);
	const cy = clamp(ball.y, rectTop, rectBottom);

	let nx = ball.x - cx;
	let ny = ball.y - cy;

	const r = ball.radius;
	const dist2 = nx * nx + ny * ny;
	if (dist2 > r * r) return false;

	let dist = Math.sqrt(dist2);
	if (dist === 0)
	{
		const midX = (rectLeft + rectRight) / 2;
		const midY = (rectTop + rectBottom) / 2;
		const penX = Math.min(Math.abs(ball.x - rectLeft), Math.abs(rectRight - ball.x));
		const penY = Math.min(Math.abs(ball.y - rectTop), Math.abs(rectBottom - ball.y));
		if (penX < penY)
		{
			nx = ball.x < midX ? -1 : 1;
			ny = 0;
		}
		else
		{
			nx = 0;
			ny = ball.y < midY ? -1 : 1;
		}
		dist = 0;
	}
	else
	{
		nx /= dist;
		ny /= dist;
	}

	const penetration = r - dist + 0.01;
	ball.x += nx * penetration;
	ball.y += ny * penetration;

	const vdotn = ball.vx * nx + ball.vy * ny;
	ball.vx = ball.vx - 2 * vdotn * nx;
	ball.vy = ball.vy - 2 * vdotn * ny;

	if (isLeftPaddle && ball.vx < 0)
	{
		ball.vx = Math.abs(ball.vx);
	}
	if (!isLeftPaddle && ball.vx > 0)
	{
		ball.vx = -Math.abs(ball.vx);
	}

	const MAX_BOUNCE_RAD = (MAX_BOUNCE_DEG * Math.PI) / 180;
	const MAX_RATIO = Math.tan(MAX_BOUNCE_RAD);
	if (Math.abs(ball.vx) < 1e-6)
	{
		ball.vx = (isLeftPaddle ? 1 : -1) * 1e-6;
	}
	const ratio = Math.abs(ball.vy / ball.vx);
	if (ratio > MAX_RATIO)
	{
		ball.vy = Math.sign(ball.vy || 1) * Math.abs(ball.vx) * MAX_RATIO;
	}
	const speedAfter = Math.max(1e-6, Math.hypot(ball.vx, ball.vy));
	const targetSpeed = Math.min(speedBefore, BALL_MAX_SPEED);
	const scale = targetSpeed / speedAfter;
	ball.vx *= scale;
	ball.vy *= scale;
	ball.lastPaddleHit = paddleName;
	return true;
};

export const resolveBallBallCollision = (a: Ball, b: Ball) => {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const dist = Math.max(1e-6, Math.hypot(dx, dy));
	const minDist = a.radius + b.radius;
	if (dist >= minDist)
	{
		return;
	}
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

	const overlap = minDist - dist + 0.5;
	a.x -= nx * overlap * 0.5;
	a.y -= ny * overlap * 0.5;
	b.x += nx * overlap * 0.5;
	b.y += ny * overlap * 0.5;
};

export const bounceOnWalls = (b: Ball) => {
	if (b.y - b.radius <= 0)
	{
		b.y = b.radius;
		b.vy = Math.abs(b.vy);
	}
	else if (b.y + b.radius >= WORLD_HEIGHT)
	{
		b.y = WORLD_HEIGHT - b.radius;
		b.vy = -Math.abs(b.vy);
	}
};