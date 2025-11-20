// todo: add shadows
// todo: optimize imports
// todo: add gates material
// todo: add camera intro animation
// todo: add stadium loading error handling
// todo: maybe add more types for environment

import '@babylonjs/loaders';
import { Animation, ArcRotateCamera, AxesViewer, Color3, CubicEase, DirectionalLight, EasingFunction, Engine, GlowLayer, HemisphericLight, Mesh, MeshBuilder, Scene, SceneLoader, StandardMaterial, Texture, Vector3 } from '@babylonjs/core';
import { CAMERA } from '../constants';

export class SceneManager {
	private scene: Scene;
	private camera: ArcRotateCamera;
	private cameraViewMode: 'overhead' | 'fps' = 'overhead';
	private environment: {
		skybox: Mesh;
		stadium: {
			ground: Mesh | null;
			group_border: Mesh | null;
			gates?: Mesh | null;
			groundTexture: Mesh[] | null;
		} | null;
	};
	private lights: {
		ambient: HemisphericLight;
		main: DirectionalLight;
	};
	private engine: Engine;
	private canvas: HTMLCanvasElement;
	// private axisHelper: AxesViewer; // dev

	constructor(engine: Engine, canvas: HTMLCanvasElement) {
		this.engine = engine;
		this.canvas = canvas;
		this.scene = this.createScene();
		this.camera = this.setupCamera();
		this.lights = this.setupLights();
		this.environment = this.setupEnvironment();
		// this.axisHelper = this.setupAxisHelper(); // dev
	}
	
	private createScene(): Scene {
		const scene = new Scene(this.engine);
		// OPTI
		scene.autoClear = true;
		scene.autoClearDepthAndStencil = true;
		scene.skipPointerMovePicking = true;
		return scene;
	}

	private setupCamera(): ArcRotateCamera {
		const camera = new ArcRotateCamera(
			'mainCamera',
			CAMERA.INITIAL_ALPHA,
			CAMERA.INITIAL_BETA,
			CAMERA.INITIAL_RADIUS,
			new Vector3(CAMERA.TARGET.x, CAMERA.TARGET.y, CAMERA.TARGET.z),
			this.scene
		);
		// camera.attachControl(this.canvas, true); //dev to move camera with drag
		// camera.lowerRadiusLimit = 10;// dev
		// camera.upperRadiusLimit = 400;// dev
		
		return camera;
	}

	private setupLights(): typeof this.lights {
		const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
		const mainLight = new DirectionalLight('mainLight', new Vector3(-1, -2, -1), this.scene);
		mainLight.position = new Vector3(20, 40, 20);
		mainLight.intensity = 0.7;
		// todo shadows
		return {
			ambient: ambientLight,
			main: mainLight
		};
	}

	private setupEnvironment(): typeof this.environment {
		const skybox = this.createSkybox();
		const environment = {
			skybox: skybox,
			stadium: null as {
				ground: Mesh | null;
				group_border: Mesh | null;
				gates: Mesh | null;
				groundTexture: Mesh[] | null;
			} | null
		};

		this.createStadium().then((stadium) => {
			environment.stadium = stadium || null;
		});
		return environment;
	}

	private createSkybox(): Mesh {
		const skybox = MeshBuilder.CreateSphere('skybox', { diameter: 150, sideOrientation: Mesh.BACKSIDE }, this.scene);
		// Material
		const skyboxMaterial = new StandardMaterial('skyboxMat', this.scene);
		const skyboxTexture = new Texture('/assets/textures/skysphere_bg.png', this.scene);

		// Texture
		skyboxTexture.uScale = 8;
		skyboxTexture.vScale = 5;
		skyboxTexture.wAng = Math.PI;
		
		// Properties
		skyboxMaterial.diffuseTexture = skyboxTexture;
		skyboxMaterial.emissiveTexture = skyboxTexture;
		skyboxMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
		skyboxMaterial.backFaceCulling = false;
		skyboxMaterial.specularColor = new Color3(0, 0, 0);
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;

		return skybox;
	}

	private async createStadium(): Promise<{ ground: Mesh | null; group_border: Mesh | null; gates: Mesh | null; groundTexture: Mesh[] | null }> {
		await SceneLoader.ImportMeshAsync('', '/assets/models/', 'stadium.gltf', this.scene);

		const ground = this.scene.getMeshByName('ground') as Mesh | null;
		const group_border = this.scene.getMeshByName('group_border') as Mesh | null;
		const gates = this.scene.getMeshByName('gates') as Mesh | null;
		const blackholeHelix = this.scene.getMeshByName('blacholeHelix') as Mesh | null;

		// Ground material
		if (ground) {
			const groundMaterial = new StandardMaterial('groundMat', this.scene);
			groundMaterial.diffuseColor = Color3.FromHexString('#0A6219');
			groundMaterial.alpha = 0.7;
			groundMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
			ground.material = groundMaterial;
			ground.receiveShadows = true;
		}

		// Border material
		if (group_border) {
			const borderGroundMaterial = new StandardMaterial('borderMat', this.scene);
			borderGroundMaterial.diffuseColor = Color3.FromHexString('#232323');
			group_border.material = borderGroundMaterial;
		}

		// Gates material // wip
		// if (gates) {
		// 	const gatesMaterial = new StandardMaterial('gatesMat', this.scene);
		// 	gatesMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
		// 	gates.material = gatesMaterial;
		// }

		const groundTexture = this.createGroundTexture();

		if (blackholeHelix) {
			const helixMaterial = new StandardMaterial('blackholeHelixMat', this.scene);
			helixMaterial.diffuseColor = Color3.FromHexString('#000000');
			helixMaterial.emissiveColor = Color3.FromHexString('#000000').scale(0.8);
			helixMaterial.specularColor = Color3.FromHexString('#000000');
			helixMaterial.alpha = 0;
			blackholeHelix.material = helixMaterial;
		}
		return { ground, group_border, gates, groundTexture };
	}

	private createGroundTexture(): Mesh[] {
		const textures: Mesh[] = [];
		const textureElements = ['centerCircle', 'centerCircleInner', 'lineMid', 'lineBorderLeft', 'lineBorderRight', 'lineBorderTop', 'lineBorderBot'];
		const whiteTexture = new StandardMaterial('whiteLineMat', this.scene);
		whiteTexture.diffuseColor = Color3.FromHexString('#FFFFFF');
		const centerInnerColorBlack = new StandardMaterial('centerInnerBlackMat', this.scene);
		centerInnerColorBlack.diffuseColor = Color3.Black();
		centerInnerColorBlack.specularColor = Color3.Black();
		centerInnerColorBlack.emissiveColor = Color3.Black();
		centerInnerColorBlack.disableLighting = true;
		centerInnerColorBlack.alpha = 0;

		for (const element of textureElements) {
			const texture = this.scene.getMeshByName(element) as Mesh | null;
			if (texture) {
				texture.material = texture.name === 'centerCircleInner' ? centerInnerColorBlack : whiteTexture;
				textures.push(texture);
			}
		}

		return textures;
	}

	// private setupAxisHelper(): AxesViewer { //dev
	// 	const axisHelper = new AxesViewer(this.scene, 1);
	// 	return axisHelper;
	// }

	public playCameraIntro(): void {
		const startHorizontalRotation = CAMERA.ANIMATION.START_ALPHA;
		const startVerticalAngle = CAMERA.ANIMATION.START_BETA;
		const startDistance = CAMERA.ANIMATION.START_RADIUS;

		const finalHorizontalRotation = CAMERA.ANIMATION.END_ALPHA;
		const finalVerticalAngle = CAMERA.ANIMATION.END_BETA;
		const finalDistance = CAMERA.ANIMATION.END_RADIUS;

		this.camera.alpha = startHorizontalRotation;
		this.camera.beta = startVerticalAngle;
		this.camera.radius = startDistance;

		// CREATE ANIMATIONS
		const horizontalRotationAnimation = new Animation(
			'cameraHorizontalRotation',
			'alpha',
			60,//fps
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
			{ frame: CAMERA.ANIMATION.DURATION_FRAMES, value: finalHorizontalRotation }
		];
		const verticalAngleKeys = [
			{ frame: 0, value: startVerticalAngle },
			{ frame: CAMERA.ANIMATION.DURATION_FRAMES, value: finalVerticalAngle }
		];
		const distanceKeys = [
			{ frame: 0, value: startDistance },
			{ frame: CAMERA.ANIMATION.DURATION_FRAMES, value: finalDistance }
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
		this.scene.beginAnimation(this.camera, 0, CAMERA.ANIMATION.DURATION_FRAMES, false);
	}

	public toggleCameraView(playerSide: 'left' | 'right' | 'spectator'): void {
		if (this.cameraViewMode === 'overhead') {
			this.cameraViewMode = 'fps';
			this.camera.alpha = playerSide === 'left' ? CAMERA.FPS_ALPHA + Math.PI : CAMERA.FPS_ALPHA;
			this.camera.beta = CAMERA.FPS_BETA;
			this.camera.radius = CAMERA.FPS_RADIUS;
		} else {
			this.cameraViewMode = 'overhead';
			this.camera.alpha = CAMERA.INITIAL_ALPHA;
			this.camera.beta = CAMERA.INITIAL_BETA;
			this.camera.radius = CAMERA.INITIAL_RADIUS;
		}
	}

	public getCamera(): ArcRotateCamera {
		return this.camera;
	}

	public getEnvironment(): typeof this.environment {
		return this.environment;
	}

	public getScene(): Scene {
		return this.scene;
	}

	public dispose(): void {
		this.environment.stadium?.ground?.dispose();
		this.environment.stadium?.group_border?.dispose();
		this.environment.stadium?.gates?.dispose();
		this.environment.skybox.dispose();
		// this.axisHelper.dispose(); // dev
		this.lights.main.dispose();
		this.lights.ambient.dispose();
		this.camera.dispose();
		this.scene.dispose();
		this.engine.dispose();
	}
}
