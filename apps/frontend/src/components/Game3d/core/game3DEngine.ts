import { Engine } from '@babylonjs/core';
import { SceneManager } from './sceneManager';
import { Renderer3D } from './renderer3D';
import { InputSystem } from '../systems/InputSystem';
import { NetworkManager } from '../network/NetworkManager';
// import type { ISystem } from '../types';
export class Game3DEngine {
	private engine: Engine;
	private sceneManager: SceneManager;
	private renderer: Renderer3D;
	private canvas: HTMLCanvasElement;
	private roomId: string;
	private isRunning: boolean = false;

	// private systems: ISystem[] = [];

	// systems
	private inputSystem!: InputSystem;
	private networkManager!: NetworkManager;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.roomId = this.getRoomIdFromURL();
		this.engine = new Engine(canvas, true);
		this.sceneManager = new SceneManager(this.engine, canvas);
		this.renderer = new Renderer3D(this.sceneManager.getScene());
		this.initializeSystems();
	}

	private getRoomIdFromURL(): string { // todo needs better secu
		return (window.location.pathname.split('/').pop() || '');
	}

	private initializeSystems(): void {
		this.inputSystem = new InputSystem(this.canvas);
		this.networkManager = new NetworkManager(this.roomId);

		this.inputSystem.initialize();
		
		this.setupNetworkCallbacks();
	}

	private setupNetworkCallbacks(): void {
		this.networkManager.onStateUpdate = (state) => {
			this.renderer.updateFromState(state); // wip: arrived here
		};

		this.networkManager.onWelcome = (side, playerNames) => {
			// Handle UI updates for welcome message
			console.log(`You are playing as ${side}. Players: ${playerNames.join(', ')}`);
		};

		this.networkManager.onGameOver = (winner, isTournament, tournamentId) => {
			// Handle game over message from the network
			console.log(`Game Over! Winner: ${winner}. Tournament: ${isTournament}, ID: ${tournamentId}`);
		};

		this.networkManager.onDisconnect = () => {
			this.pause();
			console.log('Disconnected from server.');
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

		this.networkManager.connect();

		window.addEventListener('resize', this.handleResize);
	}

	private update(): void {
		// const input = this.inputSystem.getInput(); //todo
		// this.networkManager.sendInput(input); //todo

	}

	private handleResize = (): void => {
		this.engine.resize();
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
		this.sceneManager.dispose();
		this.engine.dispose();
		this.inputSystem.dispose();
		this.networkManager.disconnect();
		
		window.removeEventListener('resize', this.handleResize);
	}
}
