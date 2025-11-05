import '@babylonjs/loaders'; // for gltf
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, SceneLoader, StandardMaterial, Color3, Mesh, Texture, AxesViewer, Animation, CubicEase, EasingFunction } from '@babylonjs/core';
import { WSClient } from '../../net/wsClient';
import { Game3dConnector, type Game3dMeshes } from './Game3dConnector';

export function initGame3d() {
	
	class Game3d {
		// Babylon.js core objects
		private canvas: HTMLCanvasElement;
		private engine: Engine;
		private scene: Scene;
		
		// Camera and lights
		private camera!: ArcRotateCamera;
		
		// Assets
		private ground: any;
		private group_border: any;
		private sphereBackground: any;
		private paddleOwner: any;
		private paddleOpponent: any;
		private ball: any;

		// Network and game logic
		private net = new WSClient();
		private connector: Game3dConnector | null = null;

		// Input tracking
		private keys: { [key: string]: boolean } = {};

		constructor(canvasId: string) {
			const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			if (!canvas) throw new Error(`Canvas with id ${canvasId} not found`);
			this.canvas = canvas;
			
			this.engine = new Engine(this.canvas, true);
			this.scene = new Scene(this.engine);
			
			this.setupCamera();
			this.setupLights();
			this.loadModels().then(() => {
				// Initialize connector after models are loaded
				this.initializeConnector();
			});
			this.loadMeshes();
			this.setupKeyboardControls();
			this.setupNetworkHandlers();
			this.connectToServer();
			this.start();
			this.animateCameraIntro();
		}

		private initializeConnector() {
			const meshes: Game3dMeshes = {
				paddleOwner: this.paddleOwner,
				paddleOpponent: this.paddleOpponent,
				ball: this.ball,
				ground: this.ground
			};
			this.connector = new Game3dConnector(this.scene, meshes);
		}

		private setupNetworkHandlers(): void {
			// Handle game state updates from server
			this.net.onState = (state) => {
				if (this.connector) {
					this.connector.updateFromGameState(state);
				}
			};

			// Handle welcome message to know which side we're on
			this.net.onWelcome = (side) => {
				console.log('3D Game: Assigned to side', side);
				if (this.connector) {
					this.connector.setSide(side === 'spectator' ? 'left' : side);
				}
			};

			// Handle game over
			this.net.onGameOver = (winner) => {
				console.log('3D Game: Game over, winner is', winner);
				// Clean up sessionStorage
				sessionStorage.removeItem('gameWsURL');
				// TODO: Show game over UI
			};
		}

		private connectToServer() {
			// First check if URL is stored in sessionStorage (from waiting room)
			const storedUrl = sessionStorage.getItem('gameWsURL');
			if (storedUrl) {
				console.log('3D Game: Connecting with stored URL:', storedUrl);
				this.net.connect(storedUrl);
			} else {
				// Fallback: construct URL from current path
				const host = import.meta.env.VITE_HOST;
				const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
				const roomId = window.location.pathname.split('/').pop();
				const fallbackUrl =
					host && endpoint && roomId ? `wss://${host}${endpoint}/${roomId}` : undefined;
				console.log('3D Game: Connecting with fallback URL:', fallbackUrl);
				this.net.connect(fallbackUrl);
			}
		}

	private setupCamera() {
		this.camera = new ArcRotateCamera(
			'camera', 
			Math.PI / 2,
			Math.PI / 3,
			30,
			Vector3.Zero(),
			this.scene
		);
		this.camera.attachControl(this.canvas, true);
		
		this.camera.lowerRadiusLimit = 10;
		this.camera.upperRadiusLimit = 100;
	}

	private animateCameraIntro() {
		const startAlpha = -Math.PI; // opposite side
		const startBeta = Math.PI / 6; // higher
		const startRadius = 80; // Farther

		const finalAlpha = Math.PI / 2;
		const finalBeta = Math.PI / 3;
		const finalRadius = 30;

		this.camera.alpha = startAlpha;
		this.camera.beta = startBeta;
		this.camera.radius = startRadius;

		// CREATE ANIMATIONS
		const alphaAnimation = new Animation(
			'cameraAlphaAnimation',
			'alpha',
			60,  //fps
			Animation.ANIMATIONTYPE_FLOAT,
			Animation.ANIMATIONLOOPMODE_CONSTANT
		);
		const betaAnimation = new Animation(
			'cameraBetaAnimation',
			'beta',
			60,
			Animation.ANIMATIONTYPE_FLOAT,
			Animation.ANIMATIONLOOPMODE_CONSTANT
		);
		const radiusAnimation = new Animation(
			'cameraRadiusAnimation',
			'radius',
			60,
			Animation.ANIMATIONTYPE_FLOAT,
			Animation.ANIMATIONLOOPMODE_CONSTANT
		);
		// KEYS
		// Rotation
		const alphaKeys = [
			{ frame: 0, value: startAlpha },
			{ frame: 180, value: finalAlpha }
		];
		// Vertical down
		const betaKeys = [
			{ frame: 0, value: startBeta },
			{ frame: 180, value: finalBeta }
		];
		// Zoom in
		const radiusKeys = [
			{ frame: 0, value: startRadius },
			{ frame: 180, value: finalRadius }
		];
		alphaAnimation.setKeys(alphaKeys);
		betaAnimation.setKeys(betaKeys);
		radiusAnimation.setKeys(radiusKeys);
		// EASING
		const easingFunction = new CubicEase();
		easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
		alphaAnimation.setEasingFunction(easingFunction);
		betaAnimation.setEasingFunction(easingFunction);
		radiusAnimation.setEasingFunction(easingFunction);
		// START ANIM
		this.camera.animations = [alphaAnimation, betaAnimation, radiusAnimation];
		this.scene.beginAnimation(this.camera, 0, 180, false);
	}

	private setupKeyboardControls() {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	private updatePaddlePosition() {
		if (!this.connector) return;

		// Get paddle intention from keys
		const intention = this.connector.getPaddleIntention(this.keys);
		
		// Send input to server
		const up = intention < 0;  // Moving up (W or ArrowUp)
		const down = intention > 0; // Moving down (S or ArrowDown)
		
		this.net.sendInput(up, down);
	}
		
	private setupLights() {
		new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
		new AxesViewer(this.scene, 5); //dev axis XYZ
	}

		private async loadModels() {
			await SceneLoader.ImportMeshAsync('', '/assets/models/', 'stadium.gltf', this.scene);

			// Components from stadium.gltf
			this.ground = this.scene.getMeshByName('ground');
			this.group_border = this.scene.getMeshByName('group_border');
			this.paddleOwner = this.scene.getMeshByName('paddleOwner');
			this.paddleOpponent = this.scene.getMeshByName('paddleOpponent');

			if (this.ground) {
				const groundMaterial = new StandardMaterial('groundMat', this.scene);
				groundMaterial.diffuseColor = Color3.FromHexString('#0A6219');
				groundMaterial.alpha = 0.7;
				groundMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
				this.ground.material = groundMaterial;
			}
			if (this.group_border) {
				const borderGroundMaterial = new StandardMaterial('borderMat', this.scene);
				borderGroundMaterial.diffuseColor = Color3.FromHexString('#232323');
				this.group_border.material = borderGroundMaterial;
			}
			if (this.paddleOwner) {
				const paddleMaterial = new StandardMaterial('paddleMat', this.scene);
				paddleMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
				this.paddleOwner.material = paddleMaterial;
			}
			if (this.paddleOpponent) {
				const paddleOpponentMaterial = new StandardMaterial('paddleOpponentMat', this.scene);
				paddleOpponentMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
				this.paddleOpponent.material = paddleOpponentMaterial;
			}
		}

		private async loadMeshes() {
			this.ball = MeshBuilder.CreateSphere('ball', {diameter: 0.3}, this.scene);
			const ballMaterial = new StandardMaterial('ballMat', this.scene);
			ballMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
			this.ball.material = ballMaterial;

			this.sphereBackground = MeshBuilder.CreateSphere('sphereBackground', { diameter: 150, sideOrientation: Mesh.BACKSIDE }, this.scene);
			const sphereBgMaterial = new StandardMaterial('sphereBgMat', this.scene);
			const sphereTexture = new Texture('/assets/textures/skysphere_bg.png', this.scene);

			sphereTexture.uScale = 8; // horizontally
			sphereTexture.vScale = 5; // vertically
			sphereTexture.wAng = Math.PI;
			sphereBgMaterial.diffuseTexture = sphereTexture;
			sphereBgMaterial.emissiveTexture = sphereTexture;
			sphereBgMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
			sphereBgMaterial.backFaceCulling = false; // texture inside
			sphereBgMaterial.specularColor = new Color3(0, 0, 0);
			sphereBgMaterial.disableLighting = true;
			this.sphereBackground.material = sphereBgMaterial;
		}

		private start() {
			this.engine.runRenderLoop(() => {
				this.updatePaddlePosition();
				this.scene.render();
			});
			
			window.addEventListener('resize', this.onResize);
		}
		
		public dispose() {
			console.log('Game3d: disposing...');
			
			// Clean up sessionStorage
			sessionStorage.removeItem('gameWsURL');
			
			// Disconnect from server
			this.net.cleanup();
			
			// Dispose connector
			if (this.connector) {
				this.connector.dispose();
				this.connector = null;
			}
			
			// Stop render loop
			this.engine.stopRenderLoop();
			
			// Clean up keyboard listeners
			window.removeEventListener('keydown', this.onKeyDown);
			window.removeEventListener('keyup', this.onKeyUp);
			window.removeEventListener('resize', this.onResize);
			
			// Dispose Babylon.js resources
			this.scene.dispose();
			this.engine.dispose();
		}

		private onKeyDown = (event: KeyboardEvent) => {
			this.keys[event.key.toLowerCase()] = true;
		};

		private onKeyUp = (event: KeyboardEvent) => {
			this.keys[event.key.toLowerCase()] = false;
		};

		private onResize = () => {
			this.engine.resize();
		};
	}
	new Game3d('game3d-canvas');
}

export function Game3d(): string {
	
	return `
		<div class="fixed inset-0 w-full h-full" data-component="game3d">
			<canvas id="game3d-canvas" class="w-full h-full block"></canvas>
			
			<!-- UI Overlay -->
			<div class="absolute top-0 left-0 right-0 flex justify-between items-center px-8 py-4 pointer-events-none">
				<div id="player-left-name" class="text-xl font-bold text-white drop-shadow-lg">Player 1</div>
				<button id="forfeit-btn" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto">
					Surrender
				</button>
				<div id="player-right-name" class="text-xl font-bold text-white drop-shadow-lg">Player 2</div>
			</div>
		</div>
	`;
}
