import type { PongGameState, TimeoutStatus } from "./types";
import type { PongParticleSystem } from "./PongParticles";
import { WORLD_WIDTH, WORLD_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_MARGIN,
COLORS, BALL_MAX_SPEED, TRAIL_THRESHOLD } from "./constants";
import type { WSClient } from "../../net/wsClient";

export class PongRenderer {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private net

	constructor(canvas: HTMLCanvasElement, net: WSClient) {
		this.net = net;
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('PongRenderer: 2D context not found');
		}
		this.ctx = ctx;
		this.setupCanvas();
	}

	setupCanvas(): void {
		const container = this.canvas.parentElement;
		if (!container)
		{
			return;
		}

		const W = WORLD_WIDTH;
		const H = WORLD_HEIGHT;
		const containerWidth = container.clientWidth * 0.9;
		const containerHeight = window.innerHeight * 0.8;
		const scaleX = containerWidth / W;
		const scaleY = containerHeight / H;
		const scale = Math.min(scaleX, scaleY);
		const displayWidth = Math.floor(W * scale);
		const displayHeight = Math.floor(H * scale);
		const dpr = window.devicePixelRatio || 1;

		this.canvas.width = W * dpr;
		this.canvas.height = H * dpr;
		this.ctx.resetTransform();
		this.ctx.scale(dpr, dpr);

		this.canvas.style.width = displayWidth + 'px';
		this.canvas.style.height = displayHeight + 'px';
		this.canvas.style.display = 'block';
		this.canvas.style.margin = '20px auto';
		this.canvas.style.border = '2px solid #333';
		this.canvas.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';

		this.ctx.imageSmoothingEnabled = true;
	}

	render(state: PongGameState, timeoutStatus: TimeoutStatus, particles: PongParticleSystem, side: 'left' | 'right' | 'spectator', smashOffsetX: (side: 'left' | 'right') => number): void {
		const ctx = this.ctx;
		const W = WORLD_WIDTH;
		const H = WORLD_HEIGHT;
		const shouldBlackout = (side === 'left' && state.blackoutLeft) || (side === 'right' && state.blackoutRight);
		const blackoutIntensity = side === 'left' ? state.blackoutLeftIntensity : side === 'right' ? state.blackoutRightIntensity : 0;

		ctx.fillStyle = COLORS.background;
		ctx.fillRect(0, 0, W, H);

		if (state.blackholeActive)
		{
			this.drawBlackHoleVortex(ctx, state);
		}
		ctx.strokeStyle = shouldBlackout ? `rgba(255, 255, 255, ${0.1 * (1 - blackoutIntensity)})` : COLORS.net;
		ctx.setLineDash([10, 10]);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(W / 2, 0);
		ctx.lineTo(W / 2, H);
		ctx.stroke();
		ctx.setLineDash([]);

		const leftX = PADDLE_MARGIN + smashOffsetX('left');
		const rightX = W - PADDLE_MARGIN - PADDLE_WIDTH + smashOffsetX('right');

		if (!shouldBlackout || side === 'left')
		{
			ctx.fillStyle = COLORS.paddle;
			ctx.fillRect(
				leftX,
				state.leftPaddle.y - PADDLE_HEIGHT / 2,
				PADDLE_WIDTH,
				PADDLE_HEIGHT
			);
		}
		if (!shouldBlackout || side === 'right')
		{
			ctx.fillStyle = COLORS.paddle;
			ctx.fillRect(
				rightX,
				state.rightPaddle.y - PADDLE_HEIGHT / 2,
				PADDLE_WIDTH,
				PADDLE_HEIGHT
			);
		}

		if (!shouldBlackout)
		{
			for (const powerUp of state.powerUps) 
			{
				this.drawPowerUp(ctx, powerUp.x, powerUp.y, powerUp.radius, state.clock, powerUp.type);
			}
		}

		particles.render(ctx);

		for (const b of state.balls) 
		{
			const speed = Math.hypot(b.vx, b.vy);
			
			if (speed >= TRAIL_THRESHOLD) 
			{
				this.drawBallTrail(ctx, b, speed);
			}

			ctx.fillStyle = COLORS.ball;
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
			ctx.fill();

			if (speed >= BALL_MAX_SPEED * 0.9) 
			{
				ctx.shadowBlur = 20;
				ctx.shadowColor = COLORS.ball;
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		}

		ctx.fillStyle = shouldBlackout ? `rgba(255, 255, 255, ${0.3 * (1 - blackoutIntensity)})` : COLORS.text;
		ctx.font = '48px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(String(state.score.left), W / 2 - 100, 60);
		ctx.fillText(String(state.score.right), W / 2 + 100, 60);

		if ((side === 'left' || side === 'right') && !shouldBlackout) 
		{
			const mySkill = side === 'left' ? state.skillStates.left : state.skillStates.right;
			const skillType = side === 'left' ? state.selectedSkills.left : state.selectedSkills.right;
			const cooldown = skillType === 'smash' ? 3 : 5;
			const progress =
				mySkill.cooldownRemaining > 0
					? Math.max(0, Math.min(1, 1 - mySkill.cooldownRemaining / cooldown))
					: 1;

			this.drawCooldownDonut(ctx, 60, 60, 28, 10, progress);

			ctx.fillStyle = COLORS.text;
			ctx.font = '16px monospace';
			ctx.textAlign = 'left';
			if (mySkill.cooldownRemaining > 0) 
			{
				ctx.fillText(mySkill.cooldownRemaining.toFixed(1) + 's', 95, 66);
			}
			ctx.textAlign = 'center';
		}

		if (shouldBlackout && blackoutIntensity > 0)
		{
			ctx.fillStyle = `rgba(0, 0, 0, ${blackoutIntensity * 0.95})`;
			ctx.fillRect(0, 0, W, H);
			this.drawNeonUnderBlackout(ctx, state, side, smashOffsetX);
		}

		this.renderOverlays(ctx, state, timeoutStatus, side, W, H);
	}

	private drawBallTrail(ctx: CanvasRenderingContext2D, ball: { x: number; y: number; vx: number; vy: number; radius: number }, speed: number): void {
		const trailLength = Math.min(8, Math.floor((speed / BALL_MAX_SPEED) * 10));
		const direction = Math.atan2(ball.vy, ball.vx);

		for (let i = 1; i <= trailLength; i++) 
		{
			const distance = i * 12;
			const trailX = ball.x - Math.cos(direction) * distance;
			const trailY = ball.y - Math.sin(direction) * distance;
			const alpha = 1 - i / trailLength;
			const size = ball.radius * (1 - i / trailLength * 0.5);

			ctx.globalAlpha = alpha * 0.6;
			ctx.fillStyle = COLORS.ballTrail;
			ctx.beginPath();
			ctx.arc(trailX, trailY, size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	private drawPowerUp(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number, type: string): void {
		const pulse = Math.sin(time * 4) * 2;

		if (type === 'blackhole')
		{
			const color = COLORS.powerUpBlackhole;
			ctx.beginPath();
			ctx.beginPath();
			ctx.fillStyle = color;
			ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#0b2230';
			ctx.lineWidth = 3;
			ctx.stroke();

			const grad = ctx.createRadialGradient(x, y, 1, x, y, radius * 0.8);
			grad.addColorStop(0, 'rgba(0,0,0,1)');
			grad.addColorStop(1, 'rgba(14,165,233,0.2)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(x, y, radius * 0.7 + pulse * 0.3, 0, Math.PI * 2);
			ctx.fill();
			return;
		}

		const color = type === 'blackout' ? COLORS.powerUpBlackout : COLORS.powerUpSplit;
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 3;
		ctx.stroke();

		if (type === 'split')
		{
			const oscillation = Math.sin(time * 3) * 3;
			const iconRadius = radius * 0.25;
			const baseOffset = radius * 0.3;
	
			ctx.beginPath();
			ctx.fillStyle = '#FFF';
			ctx.arc(x - baseOffset - oscillation, y, iconRadius, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#333';
			ctx.lineWidth = 2;
			ctx.stroke();
	
			ctx.beginPath();
			ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
			ctx.arc(x + baseOffset + oscillation, y, iconRadius, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = 'rgba(51, 51, 51, 0.8)';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		else if (type === 'blackout') 
		{
			ctx.fillStyle = '#000';
			ctx.beginPath();
			ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
			ctx.fill();
			
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(x + radius * 0.15, y, radius * 0.4, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawCooldownDonut(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, thickness: number, progress: number): void {
		const start = -Math.PI / 2;
		const end = start + progress * Math.PI * 2;

		ctx.strokeStyle = '#444';
		ctx.lineWidth = thickness;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.stroke();

		if (progress > 0) 
		{
			ctx.strokeStyle = progress >= 1 ? '#00e676' : '#ffcc00';
			ctx.lineWidth = thickness;
			ctx.beginPath();
			ctx.arc(x, y, r, start, end);
			ctx.stroke();
		}
	}

	private drawNeonUnderBlackout(ctx: CanvasRenderingContext2D, state: PongGameState, side: 'left' | 'right' | 'spectator', smashOffsetX: (side: 'left' | 'right') => number): void {
		const W = WORLD_WIDTH;
		const leftX = PADDLE_MARGIN + smashOffsetX('left');
		const rightX = W - PADDLE_MARGIN - PADDLE_WIDTH + smashOffsetX('right');

		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.shadowColor = '#ffffff';
		ctx.shadowBlur = 28;
		ctx.fillStyle = '#ffffff';

		if (side === 'left') {
			ctx.fillRect(
				leftX,
				state.leftPaddle.y - PADDLE_HEIGHT / 2,
				PADDLE_WIDTH,
				PADDLE_HEIGHT
			);
		} else if (side === 'right') {
			ctx.fillRect(
				rightX,
				state.rightPaddle.y - PADDLE_HEIGHT / 2,
				PADDLE_WIDTH,
				PADDLE_HEIGHT
			);
		}

		for (const b of state.balls) {
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
			ctx.fill();

			ctx.shadowBlur = 40;
			ctx.beginPath();
			ctx.arc(b.x, b.y, Math.max(2, b.radius * 0.85), 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}

	private drawBlackHoleVortex(ctx: CanvasRenderingContext2D, state: PongGameState): void
	{
		const cx = state.blackholeCenterX;
		const cy = state.blackholeCenterY;
		const p = Math.max(0, Math.min(1, state.blackholeProgress));
		const baseR = 260;
		const r = baseR * (0.8 + 0.6 * p);

		const pulse = Math.sin(state.clock * 3) * 0.15 + 1;
		const effectiveRadius = r * pulse;

		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, effectiveRadius);
		g.addColorStop(0.0, 'rgba(0,0,0,1)');
		g.addColorStop(0.3, 'rgba(10,5,30,0.95)');
		g.addColorStop(0.6, 'rgba(20,10,50,0.7)');
		g.addColorStop(1.0, 'rgba(0,0,0,0.1)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, effectiveRadius, 0, Math.PI * 2);
		ctx.fill();

		ctx.save();
		ctx.globalCompositeOperation = 'lighter';

		const ringCount = 8;
		for (let i = 0; i < ringCount; i++) 
		{
			const ringProgress = i / ringCount;
			const ringRadius = effectiveRadius * (0.3 + ringProgress * 0.7);
			const ringPulse = Math.sin(state.clock * 4 - ringProgress * Math.PI * 2) * 0.1 + 1;
			const actualRadius = ringRadius * ringPulse;
			
			const hue = 220 + ringProgress * 60;
			const alpha = (0.4 - ringProgress * 0.3) * (1 - p * 0.5);
			
			ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
			ctx.lineWidth = 3 - ringProgress * 2;
			
			ctx.beginPath();
			const segments = 60;
			for (let s = 0; s <= segments; s++) 
			{
				const angle = (s / segments) * Math.PI * 2;
				const distortion = Math.sin(angle * 3 + state.clock * 2 + ringProgress * Math.PI) * (5 + ringProgress * 10);
				const x = cx + Math.cos(angle) * (actualRadius + distortion);
				const y = cy + Math.sin(angle) * (actualRadius + distortion);
				
				if (s === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.stroke();
		}

		const spiralCount = 5;
		for (let i = 0; i < spiralCount; i++) 
		{
			const spiralOffset = (i / spiralCount) * Math.PI * 2;
			const spiralProgress = (state.clock * 2 + spiralOffset) % (Math.PI * 2);
			
			ctx.strokeStyle = `rgba(100, 150, 255, ${0.6 * (1 - p * 0.3)})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			
			const spiralSegments = 40;
			for (let s = 0; s < spiralSegments; s++) 
			{
				const t = s / spiralSegments;
				const angle = spiralProgress + t * Math.PI * 4;
				const radius = effectiveRadius * (0.2 + t * 0.8);
				const x = cx + Math.cos(angle) * radius;
				const y = cy + Math.sin(angle) * radius;
				
				if (s === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}

		const particleCount = 30;
		for (let i = 0; i < particleCount; i++) 
		{
			const particleAngle = (i / particleCount) * Math.PI * 2 + state.clock * 1.5;
			const orbitRadius = effectiveRadius * (0.5 + (i % 3) * 0.2);
			const wobble = Math.sin(state.clock * 3 + i) * 10;
			
			const px = cx + Math.cos(particleAngle) * (orbitRadius + wobble);
			const py = cy + Math.sin(particleAngle) * (orbitRadius + wobble);
			
			const particleSize = 2 + Math.sin(state.clock * 4 + i) * 1.5;
			const particleAlpha = 0.6 + Math.sin(state.clock * 5 + i) * 0.4;
			
			ctx.fillStyle = `rgba(150, 200, 255, ${particleAlpha})`;
			ctx.beginPath();
			ctx.arc(px, py, particleSize, 0, Math.PI * 2);
			ctx.fill();
			
			ctx.strokeStyle = `rgba(150, 200, 255, ${particleAlpha * 0.3})`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			const trailLength = 15;
			const trailX = px - Math.cos(particleAngle) * trailLength;
			const trailY = py - Math.sin(particleAngle) * trailLength;
			ctx.moveTo(px, py);
			ctx.lineTo(trailX, trailY);
			ctx.stroke();
		}

		const coreSize = 20 * pulse;
		const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
		coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
		coreGradient.addColorStop(0.3, 'rgba(150, 200, 255, 0.8)');
		coreGradient.addColorStop(0.7, 'rgba(50, 100, 200, 0.4)');
		coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
		
		ctx.fillStyle = coreGradient;
		ctx.beginPath();
		ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = `rgba(100, 150, 255, ${0.3 * pulse})`;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(cx, cy, effectiveRadius * 0.95, 0, Math.PI * 2);
		ctx.stroke();

		ctx.restore();

		const shockwaveInterval = 2;
		const timeSinceLastShock = state.clock % shockwaveInterval;
		if (timeSinceLastShock < 0.5) 
		{
			const shockProgress = timeSinceLastShock / 0.5;
			const shockRadius = effectiveRadius * shockProgress;
			const shockAlpha = (1 - shockProgress) * 0.6;
			
			ctx.strokeStyle = `rgba(200, 220, 255, ${shockAlpha})`;
			ctx.lineWidth = 4 * (1 - shockProgress);
			ctx.beginPath();
			ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
			ctx.stroke();
		}
	}

	private renderOverlays(ctx: CanvasRenderingContext2D, state: PongGameState, timeoutStatus: TimeoutStatus, side: 'left' | 'right' | 'spectator', W: number, H: number): void {
		if (state.countdownValue > 0) 
		{
			ctx.fillStyle = 'rgba(0,0,0,0.7)';
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = '#fff';
			ctx.font = '120px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(String(state.countdownValue), W / 2, H / 2);
		} 
		else if (state.isGameOver) 
		{
			ctx.fillStyle = 'rgba(0,0,0,0.7)';
			ctx.fillRect(0, 0, W, H);
			if (this.net.isTournament) 
			{
				const amILeft = this.net.side === 'left';
				const didIWin = (amILeft && state.winner === 'left') || 
							(!amILeft && state.winner === 'right');
				
				ctx.fillStyle = didIWin ? '#00ff00' : '#ff0000';
				ctx.font = '72px monospace';
				ctx.fillText(didIWin ? 'VICTOIRE !' : 'DÉFAITE', W / 2, H / 2 - 40);
				
				ctx.fillStyle = '#fff';
				ctx.font = '36px monospace';
				ctx.fillText(`${state.winner} wins`, W / 2, H / 2 + 10);
				
				ctx.font = '24px monospace';
				ctx.fillText('Redirection vers les brackets...', W / 2, H / 2 + 60);
			} 
			else 
			{
				ctx.fillStyle = '#fff';
				ctx.font = '72px monospace';
				ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
				ctx.font = '36px monospace';
				ctx.fillText(`${state.winner} wins`, W / 2, H / 2 + 10);
			}
		} 
		else if (state.isPaused) 
		{
			ctx.fillStyle = 'rgba(0,0,0,0.7)';
			ctx.fillRect(0, 0, W, H);

			const iAmLeft = side === 'left';
			const opponentDisconnected = iAmLeft
				? timeoutStatus.rightActive
				: timeoutStatus.leftActive;
			const opponentRemainingMs = iAmLeft
				? timeoutStatus.rightRemainingMs
				: timeoutStatus.leftRemainingMs;

			if (opponentDisconnected && opponentRemainingMs > 0) 
			{
				const secondsRemaining = Math.ceil(opponentRemainingMs / 1000);
				ctx.font = '36px monospace';
				ctx.fillStyle = '#ff6b6b';
				ctx.textAlign = 'center';
				ctx.fillText('⚠️ Adversaire déconnecté', W / 2, H / 2 + 20);

				ctx.font = '48px monospace';
				ctx.fillStyle = '#fff';
				ctx.fillText(`Forfeit dans: ${secondsRemaining}s`, W / 2, H / 2 + 80);

				const barWidth = 400;
				const barHeight = 10;
				const barX = (W - barWidth) / 2;
				const barY = H / 2 + 120;
				const progress = opponentRemainingMs / 30000;

				ctx.fillStyle = 'rgba(255,255,255,0.2)';
				ctx.fillRect(barX, barY, barWidth, barHeight);

				ctx.fillStyle = progress > 0.3 ? '#4CAF50' : '#ff6b6b';
				ctx.fillRect(barX, barY, barWidth * progress, barHeight);
			} 
			else 
			{
				ctx.fillStyle = '#fff';
				ctx.font = '72px monospace';
				ctx.textAlign = 'center';
				ctx.fillText('PAUSED', W / 2, H / 2);
				ctx.font = '24px monospace';
				ctx.fillText('Press P, SPACE or ESC to resume', W / 2, H / 2 + 60);
			}
		}
	}
}
