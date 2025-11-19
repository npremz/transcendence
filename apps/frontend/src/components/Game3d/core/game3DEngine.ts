import { Engine } from '@babylonjs/core';
import { SceneManager } from './sceneManager';
import { Renderer3D } from './renderer3D';
import { InputSystem } from '../systems/InputSystem';
import { NetworkManager } from '../network/NetworkManager';
import { UIManager } from '../ui/UIManager';
import { StateAdapter } from '../utils/StateAdapter';
import type { TimeoutStatus, GameStatusInfo } from '../types';

export class Game3DEngine {
	private engine: Engine;
	private sceneManager: SceneManager;
	private renderer!: Renderer3D;
	private canvas: HTMLCanvasElement;
	private roomId: string;
	private isRunning: boolean = false;

	public gameStatusInfo: GameStatusInfo = {
		isPaused: false,
		isGameOver: false,
		winner: '',
		countdownValue: 0,
		score: { left: 0, right: 0 }
	};

	private timeoutStatus: TimeoutStatus = {
		leftActive: false,
		leftRemainingMs: 0,
		rightActive: false,
		rightRemainingMs: 0
	};

	private gameOverHandled: boolean = false;

	// systems
	private inputSystem!: InputSystem;
	private networkManager!: NetworkManager;
	private uiManager!: UIManager;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.roomId = this.getRoomIdFromURL();
		
		this.engine = new Engine(canvas, true, {
			preserveDrawingBuffer: false,
			stencil: false,
			antialias: true,
			powerPreference: 'high-performance'
		});
		
		this.sceneManager = new SceneManager(this.engine, canvas);
		this.initializeSystems();
	}

	private getRoomIdFromURL(): string { // todo needs better secu
		return (window.location.pathname.split('/').pop() || '');
	}

	private initializeSystems(): void {
		this.inputSystem = new InputSystem(this.canvas);
		this.networkManager = new NetworkManager(this.roomId);
		this.uiManager = new UIManager();
		this.inputSystem.initialize();
		this.setupNetworkCallbacks();
		this.renderer = new Renderer3D(this.sceneManager.getScene(), this.networkManager);
	}

	private setupNetworkCallbacks(): void {
		this.networkManager.onStateUpdate = (serverState) => {
			this.gameStatusInfo = StateAdapter.getStatusInfo(serverState);
			const game3DState = StateAdapter.toGame3DState(serverState);
			this.renderer.updateFromState(game3DState);
		};

		this.networkManager.onPaused = () => {
			this.gameStatusInfo.isPaused = true;
			this.timeoutStatus = {
				leftActive: false,
				leftRemainingMs: 0,
				rightActive: false,
				rightRemainingMs: 0
			};
		};

		this.networkManager.onResumed = () => {
			this.gameStatusInfo.isPaused = false;
		};

		this.networkManager.onTimeoutStatus = (status) => {
			this.timeoutStatus = {
				leftActive: status.left.active,
				leftRemainingMs: status.left.remainingMs,
				rightActive: status.right.active,
				rightRemainingMs: status.right.remainingMs
			};
		};

		this.networkManager.onCountdown = (v) => {
			this.gameStatusInfo.countdownValue = v;
		};

		this.networkManager.onWelcome = (side, playerNames) => {
			this.uiManager.updatePlayerNames(side, playerNames);
			this.timeoutStatus = {
				leftActive: false,
				leftRemainingMs: 0,
				rightActive: false,
				rightRemainingMs: 0
			};
		};

		this.networkManager.onGameOver = (winner, isTournament, tournamentId) => {
			if (this.gameOverHandled) return;
			this.gameOverHandled = true;
			// Make sure internal status reflects game over so UIManager.render won't show pause overlays
			this.gameStatusInfo.isGameOver = true;
			this.gameStatusInfo.isPaused = false;
			this.gameStatusInfo.countdownValue = 0;
			
			const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement;
			if (forfeitBtn) {
				forfeitBtn.disabled = true;
			}
			
			const amILeft = this.networkManager.getSide() === 'left';
			const didIWin = (winner === 'left' && amILeft) || (winner === 'right' && !amILeft);

			if (isTournament && tournamentId) {
				// ensure any generic pause/countdown overlay is removed so tournament overlay is visible
				this.uiManager.clearOverlayById('generic-overlay');
				const overlay = this.uiManager.handleTournamentGameOver(didIWin, this.gameStatusInfo.score!);
				document.body.appendChild(overlay);
				setTimeout(() => {
					sessionStorage.removeItem('gameWsURL');
					window.router.navigate(`/tournament/${tournamentId}`); // wip redirection to 3D tournament
					document.body.removeChild(overlay);
				}, 3000);
				return;
			}
			// ensure any generic pause/countdown overlay is removed so game-over overlay is visible
			this.uiManager.clearOverlayById('generic-overlay');
			const overlay = this.uiManager.showGameOver(didIWin, this.gameStatusInfo.score!);
			document.body.appendChild(overlay);
			overlay.addEventListener('click', (e) => {
				const target = e.target as HTMLElement;
				if (target.id === 'return-to-lobby' || target.closest('#return-to-lobby')) {
					e.stopPropagation();
					sessionStorage.removeItem('gameWsURL');
					document.body.removeChild(overlay);
					window.router?.navigateTo('/play');
				}
			});
		};
	}

	// start
	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;

		this.engine.runRenderLoop(() => {
			if (!this.isRunning) return;
			this.update();
			this.render();
		});
		this.sceneManager.playCameraIntro();
		this.networkManager.connect();
		this.setupForfeitButton();

		window.addEventListener('resize', this.handleResize);
	}
	
	private setupForfeitButton(): void {
		const forfeitBtn = document.getElementById('forfeit-btn');
		if (forfeitBtn) {
			forfeitBtn.addEventListener('click', this.handleForfeit);
		}
	}

	private update(): void {
		const input = this.inputSystem.getInput();
		
		this.networkManager.sendInput(input);

		// SPACE KEY
		if (this.inputSystem.isSkillKeyPressed()) {
			this.networkManager.useSkill();
		}

		// V KEY
		if (this.inputSystem.isCameraToggleKeyPressed()) {
			this.sceneManager.toggleCameraView(this.networkManager.getSide());
		}
	}

	private handleResize = (): void => {
		this.engine.resize();
	}

	private handleForfeit = (): void => {
		const confirmed = confirm('Are you sure you want to forfeit the game?');
		if (confirmed)
			this.networkManager.forfeit();
	}

	private render(): void {
		this.uiManager.render(
			this.gameStatusInfo,
			this.timeoutStatus,
			this.networkManager.getSide());
		this.renderer.render();
	}

	public pause(): void {
		this.isRunning = false;
	}

	public resume(): void {
		if (this.isRunning) return;
		this.isRunning = true;
	}

	public dispose(): void {
		this.isRunning = false;
		this.engine.stopRenderLoop();
		this.uiManager.dispose();
		
		const forfeitBtn = document.getElementById('forfeit-btn');
		if (forfeitBtn) {
			forfeitBtn.removeEventListener('click', this.handleForfeit);
		}
		
		this.inputSystem.dispose();
		this.networkManager.disconnect();
		
		this.renderer.dispose();
		this.sceneManager.dispose();
		this.engine.dispose();
		
		window.removeEventListener('resize', this.handleResize);
	}
}
