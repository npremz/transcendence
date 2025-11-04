import '@babylonjs/loaders'; // for gltf
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, SceneLoader, StandardMaterial, Color3, Mesh, Texture, AxesViewer, Animation, CubicEase, EasingFunction } from '@babylonjs/core';

export function initGame3d() {
	
	class Game3d {
		// Babylon.js core objects
		private canvas: HTMLCanvasElement;
		private engine: Engine;
		private scene: Scene;
		
		// Camera and lights
		private camera: ArcRotateCamera;
		
		// Assets
		private imported_stadium: any;
		private ground: any;
		private group_border: any;
		private sphereBackground: any;
		private paddleOwner: any;
		private paddleOpponent: any;

		// Input tracking
		private keys: { [key: string]: boolean } = {};
		private paddleSpeed: number = 20;

		constructor(canvasId: string) {
			const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			if (!canvas) throw new Error(`Canvas with id ${canvasId} not found`);
			this.canvas = canvas;
			
			this.engine = new Engine(this.canvas, true);
			this.scene = new Scene(this.engine);
			
			this.setupCamera();
			this.setupLights();
			this.loadModels();
			this.loadMeshes();
			this.start();
			this.animateCameraIntro();
			this.setupKeyboardControls();
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

		this.camera.animations = [alphaAnimation, betaAnimation, radiusAnimation];
		this.scene.beginAnimation(this.camera, 0, 180, false);
	}

	private setupKeyboardControls() {
		window.addEventListener('keydown', (event) => {
			this.keys[event.key.toLowerCase()] = true;
		});

		window.addEventListener('keyup', (event) => {
			this.keys[event.key.toLowerCase()] = false;
		});
	}

	private updatePaddlePosition() {
		if (!this.paddleOwner) return;

		if (this.keys['w']) {
			this.paddleOwner.position.z -= this.paddleSpeed;
		}
		if (this.keys['s']) {
			this.paddleOwner.position.z += this.paddleSpeed;
		}
		const maxZ = 1080 / 2 - 100 / 2;
		const minZ = -1080 / 2 + 100 / 2;
		this.paddleOwner.position.z = Math.max(minZ, Math.min(maxZ, this.paddleOwner.position.z));
	}
		
	private setupLights() {
		new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
		// new AxesViewer(this.scene, 5); //dev axis XYZ
	}

		private async loadModels() {
			const result = await SceneLoader.ImportMeshAsync('', '/assets/models/', 'stadium.gltf', this.scene);
			this.imported_stadium = result.meshes; // wip is this important?

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
			
			window.addEventListener('resize', () => {
				this.engine.resize();
			});
		}
		
		public dispose() {
			this.engine.stopRenderLoop();
			window.removeEventListener('resize', () => {
				this.engine.resize();
			});
			this.scene.dispose();
			this.engine.dispose();
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
		</div>
	`;
}
