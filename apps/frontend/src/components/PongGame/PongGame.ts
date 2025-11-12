import type { Component } from "../types";
import { WSClient, type PublicState } from "../../net/wsClient";
import type { TimeoutStatus } from "./types";
import { PongRenderer } from "./PongRenderer";
import { PongInputHandler } from "./PongInput";
import { PongParticleSystem } from "./PongParticles";
import { PongAssets } from "./PongAssets";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { DebugPanel, type DebugPanelCallbacks } from "../DebugPanel";

type LocalGameConfig = {
	roomId: string;
	left: { id: string; username: string; selectedSkill?: 'smash' | 'dash' };
	right: { id: string; username: string; selectedSkill?: 'smash' | 'dash' };
};

class GameStatsMonitor {
	private fpsFrames: number[] = [];
	private lastFrameTime: number = performance.now();
	private pingTimes: number[] = [];
	private currentFPS: number = 0;
	
	recordFrame(): void {
		const now = performance.now();
		const delta = now - this.lastFrameTime;
		this.lastFrameTime = now;
		
		if (delta > 0) {
			const fps = 1000 / delta;
			this.fpsFrames.push(fps);
			
			if (this.fpsFrames.length > 60) {
				this.fpsFrames.shift();
			}
			
			const avgFps = this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length;
			this.currentFPS = Math.round(avgFps);
		}
	}
	
	getCurrentFPS(): number {
		return this.currentFPS;
	}
	
	addPing(ping: number): void {
		this.pingTimes.push(ping);
		if (this.pingTimes.length > 10) {
			this.pingTimes.shift();
		}
	}
	
	getAveragePing(): number {
		if (this.pingTimes.length === 0) return 0;
		const avg = this.pingTimes.reduce((a, b) => a + b, 0) / this.pingTimes.length;
		return Math.round(avg);
	}
}

export class PongGame implements Component {
	private el: HTMLElement;
	private canvas: HTMLCanvasElement;

	private net: WSClient;
	private secondaryNet?: WSClient;
	private renderer: PongRenderer;
	private input: PongInputHandler;
	private particles: PongParticleSystem;
	private assets: PongAssets;
	private debugPanel?: DebugPanel;
	private debugContainer?: HTMLDivElement;
	private isLocalMode = false;
	private localConfig?: LocalGameConfig;
	private leftController?: WSClient;
	private rightController?: WSClient;
	private statsMonitor: GameStatsMonitor;
	private lastPingTime: number = 0;
	private statsUpdateInterval: number | null = null;
	private pingInterval: number | null = null;

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
		selectedSkills: {
			left: 'smash',
			right: 'smash'
		},
		skillStates: {
			left: {cooldownRemaining: 0, lastActivationAt: -1e9},
			right: {cooldownRemaining: 0, lastActivationAt: -1e9}
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
	private gameOverHandled: boolean = false;

	constructor(element: HTMLElement) {
		this.el = element;

		const canvas = this.el.querySelector('#pong-canvas') as HTMLCanvasElement | null;
		if (!canvas)
		{
			throw new Error('PongGame: canvas not found in the component.');
		}
		this.canvas = canvas;

		this.net = new WSClient();
		this.localConfig = this.loadLocalConfig();
		if (this.localConfig) {
			this.secondaryNet = new WSClient();
			this.isLocalMode = true;
		}

		this.renderer = new PongRenderer(this.canvas, this.net);
		this.particles = new PongParticleSystem();
		this.assets = new PongAssets();
		this.input = new PongInputHandler(this.net, this.secondaryNet);
		this.statsMonitor = new GameStatsMonitor();

		this.setupNetworkHandlers();
		if (this.secondaryNet) {
			this.setupSecondaryNetworkHandlers();
		}
		this.setupEventHandlers();
		this.connectToServer();
		this.startAnimationLoop();
		this.startStatsMonitoring();
	}

	private startStatsMonitoring(): void {
		// Mettre à jour l'affichage des stats toutes les 500ms
		this.statsUpdateInterval = setInterval(() => {
			this.updateStatsDisplay();
		}, 500) as unknown as number;
		
		// Envoyer des pings toutes les 2 secondes
		this.pingInterval = setInterval(() => {
			this.sendPing();
		}, 2000) as unknown as number;
	}
	
	private sendPing(): void {
		this.lastPingTime = performance.now();
		this.net.sendPing();
	}
	
	private updateStatsDisplay(): void {
		// FPS
		const fps = this.statsMonitor.getCurrentFPS();
		const fpsElement = document.getElementById('fps-value');
		if (fpsElement) {
			fpsElement.textContent = fps.toString();
			fpsElement.className = fps >= 55 ? 'stat-good' : fps >= 30 ? 'stat-medium' : 'stat-bad';
		}
		
		// Ping
		const ping = this.statsMonitor.getAveragePing();
		const pingElement = document.getElementById('ping-value');
		if (pingElement) {
			pingElement.textContent = ping > 0 ? `${ping}ms` : '--ms';
			pingElement.className = ping < 50 ? 'stat-good' : ping < 100 ? 'stat-medium' : 'stat-bad';
		}
		
		// Connection status
		const wsState = this.net['ws']?.readyState;
		const statusElement = document.getElementById('connection-status');
		const wsIndicator = document.getElementById('ws-indicator');
		const connectionIndicator = document.getElementById('connection-indicator');
		
		if (statusElement && wsIndicator && connectionIndicator) {
			if (wsState === WebSocket.OPEN) {
				statusElement.textContent = 'CONNECTION: STABLE';
				wsIndicator.className = 'w-2 h-2 bg-green-400 rounded-full animate-pulse';
				connectionIndicator.className = 'status-indicator w-3 h-3 bg-green-400 rounded-full';
			} else if (wsState === WebSocket.CONNECTING) {
				statusElement.textContent = 'CONNECTION: CONNECTING...';
				wsIndicator.className = 'w-2 h-2 bg-yellow-400 rounded-full animate-pulse';
				connectionIndicator.className = 'status-indicator w-3 h-3 bg-yellow-400 rounded-full';
			} else {
				statusElement.textContent = 'CONNECTION: DISCONNECTED';
				wsIndicator.className = 'w-2 h-2 bg-red-400 rounded-full animate-pulse';
				connectionIndicator.className = 'status-indicator w-3 h-3 bg-red-400 rounded-full';
			}
		}
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
			if (this.gameOverHandled) {
				console.log('Game over already handled, skipping...');
				return;
			}
			this.gameOverHandled = true;
			
			console.log('Game Over!', {winner, isTournament, tournamentId});
			this.particles.createExplosion(
				this.canvas.width / 2,
				this.canvas.height / 2,
				30
			);
			
			const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement;
			if (forfeitBtn) {
				forfeitBtn.disabled = true;
			}
			
			if (isTournament && tournamentId)
			{
				this.handleTournamentGameOver(winner, tournamentId);
			}
			else
			{
				this.handleQuickplayGameOver(winner);
			}
		};

		this.net.onPong = (serverTime: number) => {
			const roundTripTime = performance.now() - this.lastPingTime;
			this.statsMonitor.addPing(roundTripTime);
		};

		this.net.onWelcome = this.createWelcomeHandler(this.net);
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
			onToggleOverlay: () => {},
			onChangeSkill: (side, skill) => this.debugChangeSkill(side, skill)
		};

		this.debugPanel = new DebugPanel(container, callbacks);
		this.debugPanel.open();
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

	private debugChangeSkill(side: 'left' | 'right', skill: 'smash' | 'dash'): void {
		this.net.debugChangeSkill(side, skill);
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
					class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all cursor-pointer"
				>
					Retour au lobby
				</button>
			</div>
		`;
		
		document.body.appendChild(overlay);

		overlay.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.id === 'return-to-lobby' || target.closest('#return-to-lobby')) {
				console.log('Return to lobby clicked');
				e.stopPropagation();
				sessionStorage.removeItem('gameWsURL');
				document.body.removeChild(overlay);
				window.router?.navigateTo('/play');
			}
		});
	}

	private setupEventHandlers(): void {
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('pong:togglePause', this.handleTogglePause);

		if (!this.isLocalMode) {
			const forfeitBtn = document.getElementById('forfeit-btn');
			if (forfeitBtn) {
				forfeitBtn.addEventListener('click', this.handleForfeit);
			}
		} else {
			// Cacher le bouton forfeit en mode local
			const forfeitBtn = document.getElementById('forfeit-btn');
			if (forfeitBtn) {
				forfeitBtn.style.display = 'none';
			}
		}

		this.input.attach();
	}

	private connectToServer(): void {
		const storedUrl = sessionStorage.getItem('gameWsURL');
		let urlToUse = storedUrl ?? undefined;
		if (!urlToUse) {
			const host = import.meta.env.VITE_HOST;
			const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
			const roomId = window.location.pathname.split('/').pop();
			if (host && endpoint && roomId) {
				urlToUse = `wss://${host}${endpoint}/${roomId}`;
			}
		}

		const leftId = this.isLocalMode ? this.localConfig?.left.id : undefined;
		this.net.connect(urlToUse, leftId ? { playerId: leftId } : undefined);

		if (this.isLocalMode && this.secondaryNet) {
			const rightId = this.localConfig?.right.id;
			if (urlToUse && rightId) {
				this.secondaryNet.connect(urlToUse, { playerId: rightId });
			} else {
				console.warn('PongGame: missing URL or right player ID for local secondary controller');
			}
		}
	}

	private setupSecondaryNetworkHandlers(): void {
		if (!this.secondaryNet) {
			return;
		}
		this.secondaryNet.onWelcome = this.createWelcomeHandler(this.secondaryNet);
	}

	private createWelcomeHandler(client: WSClient) {
		return (side: 'left' | 'right' | 'spectator', playerNames?: {left?: string; right?: string}) => {
			console.log('Welcome received:', { side, playerNames });

			const resolvedLeftName = playerNames?.left ?? this.localConfig?.left.username;
			const resolvedRightName = playerNames?.right ?? this.localConfig?.right.username;

			const updateNames = () => {
				const leftNameEl = document.getElementById('player-left-name');
				const rightNameEl = document.getElementById('player-right-name');

				if (leftNameEl && resolvedLeftName) {
					leftNameEl.textContent = resolvedLeftName;
				}
				if (rightNameEl && resolvedRightName) {
					rightNameEl.textContent = resolvedRightName;
				}

				if ((!leftNameEl || !rightNameEl) && (resolvedLeftName || resolvedRightName)) {
					setTimeout(updateNames, 100);
				}
			};

			updateNames();

			if (this.isLocalMode) {
				if (side === 'left') {
					this.leftController = client;
				} else if (side === 'right') {
					this.rightController = client;
				}

				if (this.leftController && this.rightController) {
					this.input.setControllers(this.leftController, this.rightController);
				}
			}

			if (!this.isDebugMode) {
				const username = window.simpleAuth?.getUsername?.();
				if (username === 'admindebug') {
					this.enableDebugMode();
				}
			}
		};
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

	private handleForfeit = (): void => {
		if (this.state.isGameOver) {
			return;
		}
		
		const confirmed = confirm('Are you sure you want to forfeit this game?');
		if (confirmed) {
			this.net.forfeit();
		}
	};

	private smashOffsetX = (side: 'left' | 'right'): number => {
		const skillType = side === 'left' ? this.state.selectedSkills.left : this.state.selectedSkills.right;
		if (skillType !== 'smash') 
		{
			return 0;
		}

		const skillState = side === 'left' ? this.state.skillStates.left : this.state.skillStates.right;
		const dur = 0.12;
		const dt = Math.max(0, this.state.clock - skillState.lastActivationAt);

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
			this.statsMonitor.recordFrame();
			this.particles.update();
			this.renderer.render(
				this.state,
				this.timeoutStatus,
				this.particles,
				this.net.side,
				this.smashOffsetX,
				this.isLocalMode ? { showLeftSkill: true, showRightSkill: true } : undefined
			);
			this.animationFrameId = requestAnimationFrame(animate);
		};
		animate();
	}

	private loadLocalConfig(): LocalGameConfig | undefined {
		const raw = sessionStorage.getItem('localGameConfig');
		if (!raw) {
			return undefined;
		}
		try {
			return JSON.parse(raw) as LocalGameConfig;
		} catch (err) {
			console.warn('PongGame: failed to parse local game config', err);
			return undefined;
		}
	}

	cleanup(): void {
		console.log('PongGame: cleaning up...');
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		if (this.statsUpdateInterval !== null) {
			clearInterval(this.statsUpdateInterval);
			this.statsUpdateInterval = null;
		}
		if (this.pingInterval !== null) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('pong:togglePause', this.handleTogglePause);
		
		if (!this.isLocalMode) {
			const forfeitBtn = document.getElementById('forfeit-btn');
			if (forfeitBtn) {
				forfeitBtn.removeEventListener('click', this.handleForfeit);
			}
		}
		this.input.detach();
		this.particles.clear();
		this.net.cleanup();
		if (this.debugPanel) {
			this.debugPanel.cleanup();
			this.debugPanel = undefined;
		}
		if (this.secondaryNet) {
			this.secondaryNet.cleanup();
			this.secondaryNet = undefined;
		}
		if (this.isLocalMode) {
			sessionStorage.removeItem('localGameConfig');
		}
		if (this.debugContainer && this.debugContainer.parentNode) {
			this.debugContainer.parentNode.removeChild(this.debugContainer);
			this.debugContainer = undefined;
		}
	}
}

export function Pong(): string {
	return '';
}
