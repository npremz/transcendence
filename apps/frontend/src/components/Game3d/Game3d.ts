import '@babylonjs/loaders'; // for gltf
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, ShadowGenerator, Mesh, AxesViewer, Animation, CubicEase, EasingFunction, ParticleSystem } from '@babylonjs/core';
import { WSClient, type PublicState } from '../../net/wsClient';
import { WORLD_HEIGHT } from "../PongGame/constants";
import { Game3dConnector, type Game3dMeshes } from './Game3dConnector';
import { loadBall, loadBackgroundSphere, loadCelebrationSphere, loadStadium, type StadiumMeshes , loadScoreboard, type ScoreboardMeshes, updateScoreTexture, createGoalCelebrationParticles, triggerGoalCelebration} from './AssetLoader';

export function initGame3d() {
	class Game3d {
		// Game state
		private state: PublicState = {
			leftPaddle: {y: WORLD_HEIGHT / 2, speed: 0, intention: 0},
			rightPaddle: {y: WORLD_HEIGHT / 2, speed: 0, intention: 0},
			balls: [],
			score: { left: 0, right: 0 },
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

		// Babylon.js core objects
		private canvas: HTMLCanvasElement;
		private engine: Engine;
		private scene: Scene;
		
		// Camera and lights
		private camera!: ArcRotateCamera;
		private shadowGenerator!: ShadowGenerator;
		
		// Camera view state
		private cameraView: 'overhead' | 'firstPerson' = 'overhead';
		private defaultCameraSettings = {
			alpha: -Math.PI / 2,
			beta: Math.PI / 3,
			radius: 30
		};
		private fpsCameraSettings = {
			alpha: 0,
			beta: Math.PI / 2.5,
			radius: 20
		};

		// Assets
		private stadium: StadiumMeshes | null = null;
		private sphereBackground: Mesh | null = null;
		private sphereGoalCelebration: Mesh | null = null;
		private goalParticleSystem: ParticleSystem | null = null;
		private ball: Mesh | null = null;
		private scoreboard: ScoreboardMeshes | null = null;

		// Network and game logic
		private net = new WSClient();
		private connector: Game3dConnector | null = null;
		private gameoverHandled: boolean = false;

		// Input tracking
		private keys: { [key: string]: boolean } = {};
		
		// Score tracking for updates
		private lastScore = { left: 0, right: 0 };

		constructor(canvasId: string) {
			const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			if (!canvas) throw new Error(`Canvas with id ${canvasId} not found`);
			this.canvas = canvas;
			
			this.engine = new Engine(this.canvas, true, {
				preserveDrawingBuffer: false,
				stencil: false,
				antialias: true,
				powerPreference: 'high-performance'
			});
			this.scene = new Scene(this.engine);
			
			// Optimize scene settings
			this.scene.skipPointerMovePicking = true;
			this.scene.autoClear = true;
			this.scene.autoClearDepthAndStencil = true;
			
			this.setupCamera();
			this.setupLights();
			this.loadAssets().then(() => {
				this.initializeConnector();
			});
			this.setupKeyboardControls();
			this.setupEventHandlers();
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
			this.connector = new Game3dConnector(this.scene, meshes, this.shadowGenerator);
		}

		private setupNetworkHandlers(): void {
			// Handle game state updates from server
			this.net.onState = (state) => {
				if (this.connector) {
					this.connector.updateFromGameState(state);
				}
				
				// Goal celebration animation
				if (state.score.left > this.lastScore.left && this.goalParticleSystem && this.sphereGoalCelebration) {
					triggerGoalCelebration(this.goalParticleSystem, this.sphereGoalCelebration, 'left');
				} else if (state.score.right > this.lastScore.right && this.goalParticleSystem && this.sphereGoalCelebration) {
					triggerGoalCelebration(this.goalParticleSystem, this.sphereGoalCelebration, 'right');
				}
				
				// Update scoreboard if score changed
				if (this.scoreboard && 
					(state.score.left !== this.lastScore.left || state.score.right !== this.lastScore.right)) {
					for (const texture of this.scoreboard.panelTextures) {
						updateScoreTexture(texture, state.score.left, state.score.right);
					}
					this.lastScore = { left: state.score.left, right: state.score.right };
				}
			};

			this.net.onWelcome = (side, playerNames) => {
				console.log('3D Game: Assigned to side', side);
				if (this.connector) {
					this.connector.setSide(side === 'spectator' ? 'left' : side);
				}
				const updateNames = () => {
					const leftNameEl = document.getElementById('player-left-name');
					const rightNameEl = document.getElementById('player-right-name');
					
					if (leftNameEl && playerNames?.left) {
						const leftName = side === 'left' 
							? `${playerNames.left} (You)` 
							: `${playerNames.left} (Opponent)`;
						leftNameEl.textContent = leftName;
					}
					
					if (rightNameEl && playerNames?.right) {
						const rightName = side === 'right' 
							? `${playerNames.right} (You)` 
							: `${playerNames.right} (Opponent)`;
						rightNameEl.textContent = rightName;
					}
					
					if ((!leftNameEl || !rightNameEl) && playerNames) setTimeout(updateNames, 100);
				};
				updateNames();
			};

			// Handle game over
			this.net.onGameOver = (winner, isTournament, tournamentId) => {
				if (this.gameoverHandled) return;
				this.gameoverHandled = true;
				const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement;
				if (forfeitBtn) {
					forfeitBtn.disabled = true;
				}
				if (isTournament && tournamentId) {
					this.handleTournamentGameOver(winner, tournamentId);
				} else {
					this.handleQuickplayGameOver(winner);
				}
				console.log('3D Game: Game over, winner is', winner);
				// TODO: Show game over UI
			};
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

			const finalHorizontalRotation = this.defaultCameraSettings.alpha;
			const finalVerticalAngle = this.defaultCameraSettings.beta;
			const finalDistance = this.defaultCameraSettings.radius;

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
		private setupEventHandlers(): void {
			// Forfeit button
			const forfeitBtn = document.getElementById('forfeit-btn');
			if (forfeitBtn) {
				forfeitBtn.addEventListener('click', this.handleForfeit);
			}
		}

		private updatePaddlePosition() {
			if (!this.connector) return;

			const intention = this.connector.getPaddleIntention(this.keys, this.net.side);

			const up = intention < 0;
			const down = intention > 0;
			
			this.net.sendInput(up, down);
		}

		private setupLights() {
			// Ambient light for general illumination
			new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
			
			// Directional light for shadows
			const directionalLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this.scene);
			directionalLight.position = new Vector3(20, 40, 20);
			directionalLight.intensity = 0.7;
			
			// Create shadow generator with optimized settings
			this.shadowGenerator = new ShadowGenerator(512, directionalLight); // Reduced from 1024
			this.shadowGenerator.useBlurExponentialShadowMap = false; // Disabled expensive blur
			this.shadowGenerator.usePoissonSampling = true; // Lighter alternative
			this.shadowGenerator.bias = 0.00001; // Prevent shadow acne
			
			// new AxesViewer(this.scene, 1); //dev axis XYZ
		}

		private async loadAssets() {
			this.stadium = await loadStadium(this.scene);
			this.ball = loadBall(this.scene);
			this.sphereBackground = loadBackgroundSphere(this.scene);
			this.sphereGoalCelebration = loadCelebrationSphere(this.scene);
			this.scoreboard = loadScoreboard(this.scene);
			
			// Create particle system for goal celebrations
			if (this.sphereGoalCelebration) {
				this.goalParticleSystem = createGoalCelebrationParticles(this.scene, this.sphereGoalCelebration);
			}
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

		private handleForfeit = (): void => {
			if (this.state.isGameOver) {
				return;
			}
			const confirmed = confirm('Are you sure you want to forfeit this game?');
			if (confirmed) {
				this.net.forfeit();
			}
		};

		private start() {
			this.engine.runRenderLoop(() => {
				this.updatePaddlePosition();
				this.updateCameraPosition();
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
			
			// Clean up forfeit button
			const forfeitBtn = document.getElementById('forfeit-btn');
			if (forfeitBtn) {
				forfeitBtn.removeEventListener('click', this.handleForfeit);
			}
			
			// Dispose particle system
			if (this.goalParticleSystem) {
				this.goalParticleSystem.dispose();
				this.goalParticleSystem = null;
			}
			
			// Dispose celebration sphere
			if (this.sphereGoalCelebration) {
				this.sphereGoalCelebration.dispose();
				this.sphereGoalCelebration = null;
			}
			
			// Dispose shadow generator
			if (this.shadowGenerator) {
				this.shadowGenerator.dispose();
			}
			
			// Dispose Babylon.js resources
			this.scene.dispose();
			this.engine.dispose();
		}

		private onKeyDown = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			this.keys[key] = true;
			
			if (key === 'v') {
				this.toggleCameraView();
			}
		};

		private onKeyUp = (event: KeyboardEvent) => {
			this.keys[event.key.toLowerCase()] = false;
		};

		private onResize = () => {
			this.engine.resize();
		};

		private toggleCameraView(): void {
			if (this.cameraView === 'overhead') {
				this.cameraView = 'firstPerson';
			} else {
				this.cameraView = 'overhead';
				this.camera.alpha = this.defaultCameraSettings.alpha;
				this.camera.beta = this.defaultCameraSettings.beta;
				this.camera.radius = this.defaultCameraSettings.radius;
			}
		}
		
		private updateCameraPosition(): void {
			if (this.cameraView !== 'firstPerson' || !this.connector || !this.stadium) {
				return;
			}
			const side = this.net.side;
			if (side === 'left') {
				this.camera.alpha = this.fpsCameraSettings.alpha + Math.PI;
				this.camera.beta = this.fpsCameraSettings.beta;
				this.camera.radius = this.fpsCameraSettings.radius;
			} else {
				this.camera.alpha = this.fpsCameraSettings.alpha;
				this.camera.beta = this.fpsCameraSettings.beta;
				this.camera.radius = this.fpsCameraSettings.radius;
			}
		}
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
			
			<!-- Camera View Indicator -->
			<div class="absolute bottom-4 right-4 px-3 py-2 bg-black/50 text-white text-sm rounded pointer-events-none">
				Press <span class="font-bold text-cyan-400">V</span> to toggle camera view
			</div>
		</div>
	`;
}
