import type { Particle } from "./types";
import { TRAIL_THRESHOLD, BALL_MAX_SPEED } from "./constants";

export class PongParticleSystem {
	private particles: Particle[] = [];

	addParticle(particle: Particle): void {
		this.particles.push(particle);
	}

	createExplosion(x: number, y: number, count: number = 10): void {
		for (let i = 0; i < count; i++)
		{
			const angle = (Math.PI * 2 * i) / count;
			const speed = 2 + Math.random() * 3;
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 1,
				size: 3 + Math.random() * 3,
				color: '#FFFFFF'
			});
		}
	}

	createTrail(x: number, y: number, vx: number, vy: number): void {
		const speed = Math.hypot(vx, vy);
		if (speed < TRAIL_THRESHOLD)
		{
			return;
		}
		const nx = -vx / speed;
		const ny = -vy / speed;

		this.particles.push({
			x: x + nx * 10,
			y: y + ny * 10,
			vx: 0,
			vy: 0,
			life: 0.5,
			size: 8 + (speed / 1500) * 7,
			color: `rgba(255, 255, 255, ${0.3 + (speed / BALL_MAX_SPEED) * 0.4})`
		});
	}

	update(dt: number = 0.016): void {
		for (let i = this.particles.length - 1; i >= 0; i--)
		{
			const p = this.particles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.life -= dt * 2;

			if (p.life <= 0)
			{
				this.particles.splice(i, 1);
			}
		}
	}

	render(ctx: CanvasRenderingContext2D): void {
		for (const p of this.particles)
		{
			ctx.globalAlpha = p.life;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	clear(): void {
		this.particles = [];
	}

	getParticles(): Particle[] {
		return (this.particles);
	}
}