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

	createGoalExplosion(x: number, y: number, ballVx: number, ballVy: number): void {
		const speed = Math.hypot(ballVx, ballVy);
		const dirX = speed > 0 ? ballVx / speed : 1;
		const dirY = speed > 0 ? ballVy / speed : 0;

		const mainAngle = Math.atan2(dirY, dirX);
		
		for (let i = 0; i < 80; i++) 
		{
			const angleVariation = (Math.random() - 0.5) * Math.PI * 0.15;
			const angle = mainAngle + angleVariation;
			
			const particleSpeed = 12 + Math.random() * 15;
			const size = 4 + Math.random() * 6;
			
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * particleSpeed,
				vy: Math.sin(angle) * particleSpeed,
				life: 1.0,
				size: size,
				color: '#FFFFFF'
			});
		}

		for (let i = 0; i < 60; i++) 
		{
			const angleVariation = (Math.random() - 0.5) * Math.PI * 0.25;
			const angle = mainAngle + angleVariation;
			const particleSpeed = 8 + Math.random() * 12;
			
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * particleSpeed,
				vy: Math.sin(angle) * particleSpeed,
				life: 1.0,
				size: 3 + Math.random() * 5,
				color: '#FFFFFF'
			});
		}

		for (let i = 0; i < 40; i++) 
		{
			const angleVariation = (Math.random() - 0.5) * Math.PI * 0.4;
			const angle = mainAngle + angleVariation;
			const particleSpeed = 5 + Math.random() * 8;
			
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * particleSpeed,
				vy: Math.sin(angle) * particleSpeed,
				life: 0.9,
				size: 2 + Math.random() * 4,
				color: '#FFFFFF'
			});
		}

		for (let i = 0; i < 15; i++) 
		{
			const angleVariation = (Math.random() - 0.5) * Math.PI * 0.2;
			const angle = mainAngle + angleVariation;
			const particleSpeed = 10 + Math.random() * 12;
			
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * particleSpeed,
				vy: Math.sin(angle) * particleSpeed,
				life: 1.0,
				size: 8 + Math.random() * 10,
				color: '#FFFFFF'
			});
		}

		const starCount = 12;
		for (let i = 0; i < starCount; i++) 
		{
			const angle = (Math.PI * 2 * i) / starCount;
			const particleSpeed = 8 + Math.random() * 6;
			
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * particleSpeed,
				vy: Math.sin(angle) * particleSpeed,
				life: 0.6,
				size: 5 + Math.random() * 5,
				color: '#FFFFFF'
			});
		}

		for (let i = 0; i < 30; i++) 
		{
			const angle = Math.random() * Math.PI * 2;
			const particleSpeed = Math.random() * 3;
			
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * particleSpeed,
				vy: Math.sin(angle) * particleSpeed,
				life: 1.2,
				size: 1 + Math.random() * 3,
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