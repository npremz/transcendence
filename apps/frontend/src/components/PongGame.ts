import type { Component } from "./types";
import { WSClient, type PublicState } from "../net/wsClient";
import { Button } from "./Button";

export class PongGame implements Component {
	private el: HTMLElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private startBtn: HTMLButtonElement;
	private net = new WSClient();

	private state: PublicState = {
		leftPaddle: {y: 1080 / 2, speed: 0, intention: 0},
		rightPaddle: {y: 1080 / 2, speed: 0, intention: 0},
		balls: [],
		score: {left: 0, right: 0},
		isPaused: true,
		isGameOver: false,
		winner: '',
		countdownValue: 0,
		powerUps: [],
		splitActive: false,
		clock: 0,
		smash: {
			cooldown: 0,
			animDuration: 0.12,
			left: {cooldownRemaining: 0, lastSmashAt: -1e9},
			right: {cooldownRemaining: 0, lastSmashAt: -1e9}
		}
	};

	private WORLD_WIDTH = 1920;
	private WORLD_HEIGHT = 1080;
	private PADDLE_WIDTH = 15;
	private PADDLE_HEIGHT = 100;
	private PADDLE_MARGIN = 30;

	private onResize = () => {

	};

	private onKeyDown = (e: KeyboardEvent) => {
		switch (e.key) {
			case 'w':
			case 'W':
				this.keys.w = true;
				break;
			case 's':
			case 'S':
				this.keys.s = true;
				break;
			case 'ArrowUp':
				this.keys.up = true;
				e.preventDefault();
				break;
			case 'ArrowDown':
				this.keys.down = true;
				e.preventDefault();
				break;
			case ' ':
				this.net.smash();
				e.preventDefault();
				break;
			case 'p':
			case 'P':
			case 'Escape':
				if (this.state.isPaused)
					this.net.resume();
				else
					this.net.pause();
				e.preventDefault();
				break;
		}
		this.sendIntent();
	};

	private onKeyUp = (e: KeyboardEvent) => {
		switch (e.key) {
			case 'w':
			case 'W':
				this.keys.w = false;
				break;
			case 's':
			case 'S':
				this.keys.s = false;
				break;
			case 'ArrowUp':
				this.keys.up = false;
				break;
			case 'ArrowDown':
				this.keys.down = false;
				break;
		}
		this.sendIntent();
	};

	private keys = { w: false, s: false, up: false, down: false };

	constructor(element: HTMLElement) {
		this.el = element;

		const canvas = this.el.querySelector('#pong-canvas') as HTMLCanvasElement | null;
		const startBtn = this.el.querySelector('#startBtn') as HTMLButtonElement | null;
		if (!canvas || !startBtn)
		{
			throw new Error('PongGame: canvas or button not found in the component.');
		}
		this.canvas = canvas;
		const ctx = this.canvas.getContext('2d');
		if (!ctx)
		{
			throw new Error('PongGame: 2D context not found.');
		}
		this.ctx = ctx;
		this.startBtn = startBtn;

		this.net.onState = (s) => {
			Object.assign(this.state, s);
			this.render();
		};
		this.net.onCountdown = (v) => {
			this.state.countdownValue = v;
			this.render();
		};
		this.net.onGameOver = () => {
			this.startBtn.textContent = 'Replay';
			this.render();
		};
		this.net.connect();

		this.startBtn.addEventListener('click', this.handleStartClick);

		window.addEventListener('resize', this.onResize);
   		window.addEventListener('keydown', this.onKeyDown);
    	window.addEventListener('keyup', this.onKeyUp);

		this.setupCanvas();
    	this.render();
	}

	private handleStartClick = () => {
		console.log('handleStartClickWaf');
    	this.net.resume();
  	};

	private setupCanvas() {
		const container = this.canvas.parentElement;
		if (!container) return;
		const W = this.WORLD_WIDTH, H = this.WORLD_HEIGHT;
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
	}

	private sendIntent() {
		const up = (this.keys.w || this.keys.up);
		const down = (this.keys.s || this.keys.down);
		this.net.sendInput(!!up, !!down);
	}

	private drawCooldownDonut(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, thickness: number, progress: number) {
		const start = -Math.PI / 2;
		const end = start + progress * Math.PI * 2;

		ctx.strokeStyle = '#444';
		ctx.lineWidth = thickness;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = progress >= 1 ? '#00e676' : '#ffcc00';
		ctx.beginPath();
		ctx.arc(x, y, r, start, end);
		ctx.stroke();
	}

	private smashOffsetX(side: 'left' | 'right'): number {
		const smash = this.state.smash;
		if (!smash) return 0;
		const last = side === 'left' ? smash.left.lastSmashAt : smash.right.lastSmashAt;
		const dur = smash.animDuration || 0.12;
		const dt = Math.max(0, this.state.clock - last);
		if (dt <= 0 || dt > dur) return 0;
		const t = dt / dur;
		const amp = 24;
		const dir = side === 'left' ? 1 : -1;
		return dir * amp * Math.sin(Math.PI * t);
	}



	private render() {
		const ctx = this.ctx;
		const W = this.WORLD_WIDTH, H = this.WORLD_HEIGHT;

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, W, H);

		ctx.strokeStyle = '#fff';
		ctx.setLineDash([10, 10]);
		ctx.beginPath();
		ctx.moveTo(W / 2, 0);
		ctx.lineTo(W / 2, H);
		ctx.stroke();
		ctx.setLineDash([]);

		const leftX = this.PADDLE_MARGIN + this.smashOffsetX('left');
		const rightX = (W - this.PADDLE_MARGIN - this.PADDLE_WIDTH) + this.smashOffsetX('right');

		ctx.fillStyle = '#fff';
		ctx.fillRect(this.PADDLE_MARGIN, this.state.leftPaddle.y - this.PADDLE_HEIGHT / 2, this.PADDLE_WIDTH, this.PADDLE_HEIGHT);
		ctx.fillRect(W - this.PADDLE_MARGIN - this.PADDLE_WIDTH, this.state.rightPaddle.y - this.PADDLE_HEIGHT / 2, this.PADDLE_WIDTH, this.PADDLE_HEIGHT);

		for (const powerUp of this.state.powerUps)
		{
			ctx.beginPath();
			ctx.fillStyle = '#ffcc00';
			ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
        	ctx.fill();
        	ctx.strokeStyle = '#333';
        	ctx.lineWidth = 3;
        	ctx.stroke();
		}

		ctx.fillStyle = '#fff';
		for (const b of this.state.balls) {
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
		ctx.fill();
		}

		ctx.fillStyle = '#fff';
		ctx.font = '48px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(String(this.state.score.left), W / 2 - 100, 60);
		ctx.fillText(String(this.state.score.right), W / 2 + 100, 60);

		if ((this.net.side === 'left' || this.net.side === 'right') && (this.state as any).smash) 
		{
			const smash = (this.state as any).smash;
			const mine = this.net.side === 'left' ? smash.left : smash.right;
			const progress = smash.cooldownSec > 0
			? Math.max(0, Math.min(1, 1 - (mine.cooldownRemaining / smash.cooldownSec)))
			: 1;
			this.drawCooldownDonut(ctx, 60, 60, 28, 10, progress);

			ctx.fillStyle = '#fff';
			ctx.font = '16px monospace';
			ctx.textAlign = 'left';
			if (mine.cooldownRemaining > 0) {
			ctx.fillText(mine.cooldownRemaining.toFixed(1) + 's', 95, 66);
			}
		}

		if (this.state.countdownValue > 0) {
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = '#fff';
		ctx.font = '120px monospace';
		ctx.fillText(String(this.state.countdownValue), W / 2, H / 2);
		} else if (this.state.isGameOver) {
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = '#fff';
		ctx.font = '72px monospace';
		ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
		ctx.font = '36px monospace';
		ctx.fillText(`${this.state.winner} wins`, W / 2, H / 2 + 10);
		ctx.font = '24px monospace';
		ctx.fillText('Click "Rejouer" to restart', W / 2, H / 2 + 60);
		} else if (this.state.isPaused) {
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = '#fff';
		ctx.font = '72px monospace';
		ctx.fillText('PAUSED', W / 2, H / 2);
		ctx.font = '24px monospace';
		ctx.fillText('Press P, SPACE or ESC to resume', W / 2, H / 2 + 60);
		}
	}

	cleanup(): void {
		this.startBtn.removeEventListener('click', this.handleStartClick);
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
	}
}

export function Pong(): string { 
	return `
		<div class="container ml-auto mr-auto flex flex-col items-center" data-component="pong-game">
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
}
