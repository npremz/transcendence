import '@babylonjs/loaders'; // for gltf
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, AxesViewer, Animation, CubicEase, EasingFunction } from '@babylonjs/core';
import { WSClient } from '../../net/wsClient';
import { Game3dConnector, type Game3dMeshes } from './Game3dConnector';
import { loadBall, loadBackgroundSphere, loadStadium, type StadiumMeshes , loadScoreboard, type ScoreboardMeshes, updateScoreTexture} from './AssetLoader';


export function initGame3d() {
	
	class Game3d {
		// Babylon.js core objects
		private canvas: HTMLCanvasElement;
		private engine: Engine;
		private scene: Scene;
		
		// Camera and lights
		private camera!: ArcRotateCamera;
		
		// Assets
		private stadium: StadiumMeshes | null = null;
		private sphereBackground: Mesh | null = null;
		private ball: Mesh | null = null;
		private scoreboard: ScoreboardMeshes | null = null;

		// Network and game logic
		private net = new WSClient();
		private connector: Game3dConnector | null = null;

		// Input tracking
		private keys: { [key: string]: boolean } = {};
		
		// Score tracking for updates
		private lastScore = { left: 0, right: 0 };

		constructor(canvasId: string) {
			const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			if (!canvas) throw new Error(`Canvas with id ${canvasId} not found`);
			this.canvas = canvas;
			
			this.engine = new Engine(this.canvas, true);
			this.scene = new Scene(this.engine);
			
			this.setupCamera();
			this.setupLights();
			this.loadAssets().then(() => {
				this.initializeConnector();
			});
			this.setupKeyboardControls();
			this.setupNetworkHandlers();
			this.connectToServer();
			this.start();
			this.animateCameraIntro();
		}

		private initializeConnector() {
			if (!this.stadium || !this.ball) return;
			const meshes: Game3dMeshes = {
				paddleLeft: this.stadium.paddleLeft,
				paddleRight: this.stadium.paddleRight,
				ball: this.ball,
				ground: this.stadium.ground
			};
			this.connector = new Game3dConnector(this.scene, meshes);
		}

		private setupNetworkHandlers(): void {
			// Handle game state updates from server
			this.net.onState = (state) => {
				if (this.connector) {
					this.connector.updateFromGameState(state);
				}
				
				if (this.scoreboard && 
					(state.score.left !== this.lastScore.left || state.score.right !== this.lastScore.right)) {
					for (const texture of this.scoreboard.panelTextures) {
						updateScoreTexture(texture, state.score.left, state.score.right);
					}
					this.lastScore = { left: state.score.left, right: state.score.right };
				}
			};

			this.net.onWelcome = (side) => {
				console.log('3D Game: Assigned to side', side);
				if (this.connector) {
					this.connector.setSide(side === 'spectator' ? 'left' : side);
				}
				this.updatePlayerSideLabels(side === 'spectator' ? 'left' : side);
			};

			// Handle game over
			this.net.onGameOver = (winner) => {
				console.log('3D Game: Game over, winner is', winner);
				// Clean up sessionStorage
				sessionStorage.removeItem('gameWsURL');
				// TODO: Show game over UI
			};
		}

		private updatePlayerSideLabels(playerSide: 'left' | 'right') {
			const leftNameEl = document.getElementById('player-left-name');
			const rightNameEl = document.getElementById('player-right-name');
			
			if (leftNameEl && rightNameEl) {
				if (playerSide === 'left') {
					leftNameEl.textContent = 'Player 1 (You - Left)';
					rightNameEl.textContent = 'Player 2 (Opponent - Right)';
				} else {
					leftNameEl.textContent = 'Player 1 (Opponent - Left)';
					rightNameEl.textContent = 'Player 2 (You - Right)';
				}
			}
		}

		private connectToServer() {
			const storedUrl = sessionStorage.getItem('gameWsURL');
			if (storedUrl) {
				console.log('3D Game: Connecting with stored URL:', storedUrl);
				this.net.connect(storedUrl);
			} else {
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
				-Math.PI / 2,  // Look from right to left (opposite direction)
				Math.PI / 3,
				30,
				Vector3.Zero(),
				this.scene
			);
			this.camera.attachControl(this.canvas, true);
			
			this.camera.lowerRadiusLimit = 10;
			this.camera.upperRadiusLimit = 400;
		}

		private animateCameraIntro() {
			const startHorizontalRotation = Math.PI / 2;
			const startVerticalAngle = Math.PI / 6;
			const startDistance = 80;

			const finalHorizontalRotation = -Math.PI / 2;
			const finalVerticalAngle = Math.PI / 3;
			const finalDistance = 30;

			this.camera.alpha = startHorizontalRotation;
			this.camera.beta = startVerticalAngle;
			this.camera.radius = startDistance;

			// CREATE ANIMATIONS
			const horizontalRotationAnimation = new Animation(
				'cameraHorizontalRotation',
				'alpha',
				60,  //fps
				Animation.ANIMATIONTYPE_FLOAT,
				Animation.ANIMATIONLOOPMODE_CONSTANT
			);
			const verticalAngleAnimation = new Animation(
				'cameraVerticalAngle',
				'beta',
				60,
				Animation.ANIMATIONTYPE_FLOAT,
				Animation.ANIMATIONLOOPMODE_CONSTANT
			);
			const distanceAnimation = new Animation(
				'cameraDistance',
				'radius',
				60,
				Animation.ANIMATIONTYPE_FLOAT,
				Animation.ANIMATIONLOOPMODE_CONSTANT
			);
			
			// KEYFRAMES
			const horizontalRotationKeys = [
				{ frame: 0, value: startHorizontalRotation },
				{ frame: 180, value: finalHorizontalRotation }
			];
			const verticalAngleKeys = [
				{ frame: 0, value: startVerticalAngle },
				{ frame: 180, value: finalVerticalAngle }
			];
			const distanceKeys = [
				{ frame: 0, value: startDistance },
				{ frame: 180, value: finalDistance }
			];
			
			horizontalRotationAnimation.setKeys(horizontalRotationKeys);
			verticalAngleAnimation.setKeys(verticalAngleKeys);
			distanceAnimation.setKeys(distanceKeys);
			
			// EASING
			const easingFunction = new CubicEase();
			easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
			horizontalRotationAnimation.setEasingFunction(easingFunction);
			verticalAngleAnimation.setEasingFunction(easingFunction);
			distanceAnimation.setEasingFunction(easingFunction);
			
			// START ANIMATION
			this.camera.animations = [horizontalRotationAnimation, verticalAngleAnimation, distanceAnimation];
			const animatable = this.scene.beginAnimation(this.camera, 0, 180, false);
			
			// animatable.onAnimationEnd = () => { // DEV: is the reason why const animatable is created
			// 	this.camera.alpha = -Math.PI / 2;
			// 	this.camera.beta = Math.PI / 3;
			// 	this.camera.radius = 75;
			// };
		}

		private setupKeyboardControls() {
			window.addEventListener('keydown', this.onKeyDown);
			window.addEventListener('keyup', this.onKeyUp);
		}

		private updatePaddlePosition() {
			if (!this.connector) return;

			const intention = this.connector.getPaddleIntention(this.keys);
			
			const up = intention < 0;
			const down = intention > 0;
			
			this.net.sendInput(up, down);
		}
			
		private setupLights() {
			new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
			// new AxesViewer(this.scene, 1); //dev axis XYZ
		}

		private async loadAssets() {
			this.stadium = await loadStadium(this.scene);
			this.ball = loadBall(this.scene);
			this.sphereBackground = loadBackgroundSphere(this.scene);
			this.scoreboard = loadScoreboard(this.scene);
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
