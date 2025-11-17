import { Engine } from '@babylonjs/core';
import { SceneManager } from './sceneManager';
import { Renderer3D } from './renderer3D';
import { InputSystem } from '../systems/InputSystem';
import { NetworkManager } from '../network/NetworkManager';
import { UIManager } from '../ui/UIManager';
import { StateAdapter } from '../utils/StateAdapter';

export class Game3DEngine {
	private engine: Engine;
	private sceneManager: SceneManager;
	private renderer!: Renderer3D;
	private canvas: HTMLCanvasElement;
	private roomId: string;
	private isRunning: boolean = false;
	private mySide: 'left' | 'right' | 'spectator' = 'spectator';

	// private systems: ISystem[] = [];

	// systems
	private inputSystem!: InputSystem;
	private networkManager!: NetworkManager;
	private uiManager!: UIManager;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.roomId = this.getRoomIdFromURL();
		
		// Create engine with performance optimizations
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
		// Update game state every frame
		this.networkManager.onStateUpdate = (serverState) => {
			const game3DState = StateAdapter.toGame3DState(serverState);
			this.renderer.updateFromState(game3DState);
		};

		// Handle initial connection
		this.networkManager.onWelcome = (side, playerNames) => {
			this.uiManager.updatePlayerNames(side, playerNames);
		};

		this.networkManager.onGameOver = (winner, isTournament, tournamentId) => {
			this.pause();
			
			const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement;
			if (forfeitBtn) {
				forfeitBtn.disabled = true;
			}
			
			const side = this.networkManager.getSide();
			const overlay = this.uiManager.showGameOver(winner as 'left' | 'right', side);

			overlay.querySelector('#game-over-return-btn')?.addEventListener('click', () => {
				sessionStorage.removeItem('gameWsURL');
				this.uiManager.removeOverlay(overlay);
				window.router?.navigateTo('/play');
			});
			// todo check for tournament
		};

		// Handle disconnection
		this.networkManager.onDisconnect = () => {
			this.pause();
			console.error('[Game3D] Disconnected from server');
			
			const overlay = this.uiManager.showDisconnect();
			
			// Add click handler
			overlay.querySelector('#disconnect-return-btn')?.addEventListener('click', () => {
				sessionStorage.removeItem('gameWsURL');
				this.uiManager.removeOverlay(overlay);
				window.router?.navigateTo('/');
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
		// Get player input
		const input = this.inputSystem.getInput();
		
		// Send input to server
		this.networkManager.sendInput(input);

		// Handle skill activation (Space key)
		if (this.inputSystem.isSkillKeyPressed()) {
			this.networkManager.useSkill();
		}

		// Handle camera toggle (V key)
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
		
		// Clean up forfeit button
		const forfeitBtn = document.getElementById('forfeit-btn');
		if (forfeitBtn) {
			forfeitBtn.removeEventListener('click', this.handleForfeit);
		}
		
		// Dispose all systems
		this.inputSystem.dispose();
		this.networkManager.disconnect();
		this.uiManager.dispose();
		
		// Dispose rendering
		this.renderer.dispose();
		this.sceneManager.dispose();
		this.engine.dispose();
		
		window.removeEventListener('resize', this.handleResize);
	}
}
