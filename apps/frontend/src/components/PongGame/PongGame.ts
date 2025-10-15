import type { Component } from "../types";
import { WSClient, type PublicState } from "../../net/wsClient";
import type { TimeoutStatus } from "./types";
import { PongRenderer } from "./PongRenderer";
import { PongInputHandler } from "./PongInput";
import { PongParticleSystem } from "./PongParticles";
import { PongAssets } from "./PongAssets";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { DebugPanel, type DebugPanelCallbacks } from "../DebugPanel";

export class PongGame implements Component {
	private el: HTMLElement;
	private canvas: HTMLCanvasElement;

	private net = new WSClient();
	private renderer: PongRenderer;
	private input: PongInputHandler;
	private particles: PongParticleSystem;
	private assets: PongAssets;
    private debugPanel?: DebugPanel;
    private debugContainer?: HTMLDivElement;

	private state: PublicState = {
		leftPaddle: {y: WORLD_HEIGHT / 2, speed: 0, intention: 0},
		rightPaddle: {y: WORLD_HEIGHT / 2, speed: 0, intention: 0},
		balls: [],
		score: {left: 0, right: 0},
		isPaused: true,
		isGameOver: false,
		winner: '',
		countdownValue: 0,
		powerUps: [],
		splitActive: false,
		clock: 0,
		blackoutLeft: false,
		blackoutRight: false,
		blackoutLeftIntensity: 0,
		blackoutRightIntensity: 0,
		blackholeActive: false,
		blackholeCenterX: 0,
		blackholeCenterY: 0,
		blackholeProgress: 0,
		smash: {
			cooldown: 0,
			animDuration: 0.12,
			left: {cooldownRemaining: 0, lastSmashAt: -1e9},
			right: {cooldownRemaining: 0, lastSmashAt: -1e9}
		}
	};

    private timeoutStatus: TimeoutStatus = {
        leftActive: false,
        leftRemainingMs: 0,
        rightActive: false,
        rightRemainingMs: 0
    };

	private animationFrameId: number | null = null;
	private lastScore = { left: 0, right: 0 };
	private lastBallPositions: Array<{x: number; y: number; vx: number; vy: number}> = [];
    private isDebugMode: boolean = false;


	constructor(element: HTMLElement) {
		this.el = element;

		const canvas = this.el.querySelector('#pong-canvas') as HTMLCanvasElement | null;
		if (!canvas)
		{
			throw new Error('PongGame: canvas or button not found in the component.');
		}
		this.canvas = canvas;

		this.renderer = new PongRenderer(this.canvas, this.net);
		this.input = new PongInputHandler(this.net);
		this.particles = new PongParticleSystem();
		this.assets = new PongAssets();

		this.setupNetworkHandlers();
		this.setupEventHandlers();
		this.connectToServer();

		this.startAnimationLoop();

	}

	private setupNetworkHandlers(): void {
		this.net.onState = (s: PublicState) => {
			const currentBallPositions = s.balls.map(b => ({
				x: b.x,
				y: b.y,
				vx: b.vx,
				vy: b.vy
			}))
			if (s.score.left > this.lastScore.left)
			{
				const lastBall = this.lastBallPositions.find(b => b.x > WORLD_WIDTH - 100);
				if (lastBall)
				{
					this.particles.createGoalExplosion(
						lastBall.x,
						lastBall.y,
						lastBall.vx,
						lastBall.vy
					);
				}
				this.triggerScreenShake();
			}
			if (s.score.right > this.lastScore.right)
			{
				const lastBall = this.lastBallPositions.find(b => b.x < 100);
				if (lastBall)
				{
					this.particles.createGoalExplosion(
						lastBall.x,
						lastBall.y,
						lastBall.vx,
						lastBall.vy
					);
				}
				this.triggerScreenShake();
			}
			this.lastBallPositions = currentBallPositions;
			this.lastScore = {left: s.score.left, right: s.score.right};

			for (const ball of s.balls) {
				this.particles.createTrail(ball.x, ball.y, ball.vx, ball.vy);
			}

			Object.assign(this.state, s);
            if (this.debugPanel && this.isDebugMode) 
            {
				this.debugPanel.updateStats(s, this.particles.getParticles().length);
			}
		};

		this.net.onPaused = () => {
			this.state.isPaused = true;
			this.timeoutStatus = {
				leftActive: false,
				leftRemainingMs: 0,
				rightActive: false,
				rightRemainingMs: 0
			};
		};

		this.net.onTimeoutStatus = (status) => {
			this.timeoutStatus = {
				leftActive: status.left.active,
				leftRemainingMs: status.left.remainingMs,
				rightActive: status.right.active,
				rightRemainingMs: status.right.remainingMs
			};
		};

		this.net.onCountdown = (v: number) => {
			this.state.countdownValue = v;
		};

		this.net.onGameOver = (winner, isTournament, tournamentId) => {
			console.log('Game Over!', {winner, isTournament, tournamentId});
			this.particles.createExplosion(
				this.canvas.width / 2,
				this.canvas.height / 2,
				30
			);
			if (isTournament && tournamentId)
			{
                this.handleTournamentGameOver(winner, tournamentId);
            }
			else
			{
				this.handleQuickplayGameOver(winner);
			}
		};
        this.net.onWelcome = (side, username) => {
            if (username === 'admindebug')
            {
                this.enableDebugMode();
            }
        }
	}

    private enableDebugMode(): void {
		this.isDebugMode = true;
		console.log('Debug Mode Enabled!');

        const container = document.createElement('div');
        container.id = 'debug-panel-container';
        container.style.marginTop = '16px';

		 this.canvas.insertAdjacentElement('afterend', container);
         this.debugContainer = container;
        

		const callbacks: DebugPanelCallbacks = {
			onActivatePowerUp: (type) => this.debugActivatePowerUp(type),
			onClearPowerUps: () => this.debugClearPowerUps(),
			onScoreChange: (side, amount) => this.debugChangeScore(side, amount),
			onResetScore: () => this.debugResetScore(),
			onSetScore: (left, right) => this.debugSetScore(left, right),
			onBallControl: (action) => this.debugBallControl(action),
			onBallSpeedControl: (action) => this.debugBallSpeedControl(action),
			onTimeControl: (action) => this.debugTimeControl(action),
			onToggleOverlay: () => {}
		};

		this.debugPanel = new DebugPanel(container, callbacks);
	}

    private debugActivatePowerUp(type: 'split' | 'blackout' | 'blackhole' | 'random'): void {
        const types = ['split', 'blackout', 'blackhole'] as const;
        const finalType = type === 'random' ? types[Math.floor(Math.random() * types.length)] : type;
        this.net.debugActivatePowerUp(finalType);
    }

    private debugClearPowerUps(): void {
        this.net.debugClearPowerUps();
    }

    private debugChangeScore(side: 'left' | 'right', amount: number): void {
        this.net.debugScoreChange(side, amount);
    }

    private debugResetScore(): void {
        this.net.debugResetScore();
    }

    private debugSetScore(left: number, right: number): void {
        this.net.debugSetScore(left, right);
    }

    private debugBallControl(action: 'add' | 'remove' | 'reset'): void {
        this.net.debugBallControl(action);
    }

    private debugBallSpeedControl(action: 'multiply' | 'divide' | 'freeze'): void {
        this.net.debugBallSpeed(action);
    }

    private debugTimeControl(action: 'slow' | 'fast' | 'normal'): void {
        const scale = action === 'slow' ? 0.5 : action === 'fast' ? 2 : 1;
        this.net.debugTimeScale(scale);
    }

	private triggerScreenShake(): void 
	{
		const canvas = this.canvas;
		const originalTransform = canvas.style.transform;
		
		let shakeIntensity = 8;
		let shakeCount = 0;
		const maxShakes = 10;
		
		const shake = () => {
			if (shakeCount >= maxShakes) {
				canvas.style.transform = originalTransform;
				return;
			}
			
			const x = (Math.random() - 0.5) * shakeIntensity;
			const y = (Math.random() - 0.5) * shakeIntensity;
			canvas.style.transform = `translate(${x}px, ${y}px)`;
			
			shakeIntensity *= 0.85;
			shakeCount++;
			
			setTimeout(shake, 40);
		};
		
		shake();
	}
	private handleTournamentGameOver(winner: 'left' | 'right', tournamentId: string) {
        const amILeft = this.net.side === 'left';
        const didIWin = (amILeft && winner === 'left') || (!amILeft && winner === 'right');

        this.state.isGameOver = true;
        this.state.winner = winner;

        const message = didIWin 
            ? 'Victoire ! Redirection vers les brackets...' 
            : 'Défaite... Redirection vers les brackets...';
        
        console.log(message);

        setTimeout(() => {
			sessionStorage.removeItem('gameWsURL');
            window.location.href = `/tournament/${tournamentId}`;
        }, 3000);
    }

	private handleQuickplayGameOver(winner: 'left' | 'right') {
		const amILeft = this.net.side === 'left';
		const didIWin = (amILeft && winner === 'left') || (!amILeft && winner === 'right');

		this.state.isGameOver = true;
		this.state.winner = winner;

		// Créer un overlay avec le résultat et un bouton
		const overlay = document.createElement('div');
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-[#0C154D]/90 border-2 border-white/20 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-4xl font-bold mb-4 ${didIWin ? 'text-green-400' : 'text-red-400'}">
					${didIWin ? '🏆 VICTOIRE !' : '💀 DÉFAITE'}
				</h2>
				<p class="text-white/80 text-xl mb-6">
					Score: ${this.state.score.left} - ${this.state.score.right}
				</p>
				<button 
					id="return-to-lobby"
					class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all pointer"
				>
					Retour au lobby
				</button>
			</div>
		`;
		
		document.body.appendChild(overlay);

		// Ajouter l'event listener pour le bouton
		document.getElementById('return-to-lobby')?.addEventListener('click', () => {
			sessionStorage.removeItem('gameWsURL');
			window.location.href = '/test';
		});
	}

	private setupEventHandlers(): void {
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('pong:togglePause', this.handleTogglePause);

		this.input.attach();
	}

	private connectToServer(): void {
		const storedUrl = sessionStorage.getItem('gameWsURL');
		if (storedUrl) 
		{
			this.net.connect(storedUrl);
		} 
		else 
		{
			const host = import.meta.env.VITE_HOST;
			const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
			const roomId = window.location.pathname.split('/').pop();
			const fallback =
				host && endpoint && roomId ? `wss://${host}${endpoint}/${roomId}` : undefined;
			this.net.connect(fallback);
		}
	}

	private handleResize = (): void => {
		this.renderer.setupCanvas();
	};

	private handleTogglePause = (): void => {
		if (this.state.isPaused) 
		{
			this.net.resume();
		} 
		else 
		{
			this.net.pause();
		}
	};

	private smashOffsetX = (side: 'left' | 'right'): number => {
		const smash = this.state.smash;
		if (!smash) 
		{
			return 0;
		}

		const last = side === 'left' ? smash.left.lastSmashAt : smash.right.lastSmashAt;
		const dur = smash.animDuration;
		const dt = Math.max(0, this.state.clock - last);

		if (dt <= 0 || dt > dur) 
		{
			return 0;
		}

		const t = dt / dur;
		const amp = 24;
		const dir = side === 'left' ? 1 : -1;

		return (dir * amp * Math.sin(Math.PI * t));
	};

	private startAnimationLoop(): void {
		const animate = (): void => {
			this.particles.update();
			this.renderer.render(
				this.state,
				this.timeoutStatus,
				this.particles,
				this.net.side,
				this.smashOffsetX
			);
			this.animationFrameId = requestAnimationFrame(animate);
		};
		animate();
	}

	cleanup(): void {
		if (this.animationFrameId !== null) 
		{
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('pong:togglePause', this.handleTogglePause);

        this.input.detach();
        this.particles.clear();
        if (this.debugPanel) {
            this.debugPanel.cleanup();
            this.debugPanel = undefined;
        }
        if (this.debugContainer && this.debugContainer.parentNode) {
            this.debugContainer.parentNode.removeChild(this.debugContainer);
            this.debugContainer = undefined;
        }
    }
}

export function Pong(): string {
	
	return `
		<div class="container ml-auto mr-auto flex flex-col items-center" data-component="pong-game">
			<canvas id="pong-canvas"></canvas>
		</div>
	`;
}
