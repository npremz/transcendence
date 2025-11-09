import { MeshBuilder, StandardMaterial, Color3, Scene, Mesh, Texture, SceneLoader, AbstractMesh, Vector3, DynamicTexture, ParticleSystem, Color4 } from '@babylonjs/core';

export interface StadiumMeshes {
	ground: AbstractMesh | null;
	group_border: AbstractMesh | null;
	paddleLeft: AbstractMesh | null;
	paddleRight: AbstractMesh | null;
}

export interface ScoreboardMeshes {
	parent: Mesh;
	panels: Mesh[];
	panelTextures: DynamicTexture[];
}

export function loadBall(scene: Scene): Mesh {
	const ball = MeshBuilder.CreateSphere('ball', { diameter: 0.3 }, scene);
	const ballMaterial = new StandardMaterial('ballMat', scene);
	ballMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
	ball.material = ballMaterial;
	return ball;
}

export function loadBackgroundSphere(scene: Scene): Mesh {
	// Geometry
	const sphereBackground = MeshBuilder.CreateSphere('sphereBackground', { diameter: 150, sideOrientation: Mesh.BACKSIDE }, scene);
	
	// Material
	const sphereBgMaterial = new StandardMaterial('sphereBgMat', scene);
	const sphereTexture = new Texture('/assets/textures/skysphere_bg.png', scene);

	// Texture
	sphereTexture.uScale = 8;
	sphereTexture.vScale = 5;
	sphereTexture.wAng = Math.PI;
	
	// Properties
	sphereBgMaterial.diffuseTexture = sphereTexture;
	sphereBgMaterial.emissiveTexture = sphereTexture;
	sphereBgMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
	sphereBgMaterial.backFaceCulling = false;
	sphereBgMaterial.specularColor = new Color3(0, 0, 0);
	sphereBgMaterial.disableLighting = true;
	sphereBackground.material = sphereBgMaterial;
	
	return sphereBackground;
}

export function loadCelebrationSphere(scene: Scene): Mesh {
	// Geometry
	const sphereCelebration = MeshBuilder.CreateSphere('sphereCelebration', { diameter: 149, sideOrientation: Mesh.BACKSIDE }, scene);
	const sphereCelebrationMaterial = new StandardMaterial('sphereCelebrationMat', scene);
	sphereCelebrationMaterial.alpha = 0;
	sphereCelebrationMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
	sphereCelebration.material = sphereCelebrationMaterial;
	return sphereCelebration;
}

export async function loadStadium(scene: Scene): Promise<StadiumMeshes> {
	// Load GLTF
	await SceneLoader.ImportMeshAsync('', '/assets/models/', 'stadium.gltf', scene);

	// Get meshes
	const ground = scene.getMeshByName('ground');
	const group_border = scene.getMeshByName('group_border');
	const paddleLeft = scene.getMeshByName('paddleOwner');
	const paddleRight = scene.getMeshByName('paddleOpponent');

	// Ground material
	if (ground) {
		const groundMaterial = new StandardMaterial('groundMat', scene);
		groundMaterial.diffuseColor = Color3.FromHexString('#0A6219');
		groundMaterial.alpha = 0.7;
		groundMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
		ground.material = groundMaterial;
		ground.receiveShadows = true; // Enable shadow receiving
	}

	// Border material
	if (group_border) {
		const borderGroundMaterial = new StandardMaterial('borderMat', scene);
		borderGroundMaterial.diffuseColor = Color3.FromHexString('#232323');
		group_border.material = borderGroundMaterial;
	}

	// Paddle materials
	if (paddleLeft) {
		const paddleMaterial = new StandardMaterial('paddleMat', scene);
		paddleMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
		paddleLeft.material = paddleMaterial;
	}

	if (paddleRight) {
		const paddleOpponentMaterial = new StandardMaterial('paddleOpponentMat', scene);
		paddleOpponentMaterial.diffuseColor = Color3.FromHexString('#FFFFFF');
		paddleRight.material = paddleOpponentMaterial;
	}

	return { ground, group_border, paddleLeft, paddleRight };
}

function createScoreTexture(scene: Scene, scoreLeft: number = 0, scoreRight: number = 0): DynamicTexture {
	const texture = new DynamicTexture('scoreTexture', { width: 1024, height: 1024 }, scene, false);
	const ctx = texture.getContext() as CanvasRenderingContext2D;
	
	// Background
	ctx.fillStyle = '#0a4d66';
	ctx.fillRect(0, 0, 1024, 1024);
	
	// Stripes
	ctx.fillStyle = '#083d52';
	for (let i = 0; i < 1024; i += 8) {
		ctx.fillRect(0, i, 1024, 4);
	}
	
	const scoreText = `${scoreLeft} - ${scoreRight}`;
	
	// Text properties
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 16;
	ctx.font = 'bold 480px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	// Black outline
	ctx.strokeText(scoreText, 512, 512);
	
	// Cyan glow
	ctx.shadowColor = '#00ffff';
	ctx.shadowBlur = 40;
	ctx.fillStyle = '#00d4ff';
	ctx.fillText(scoreText, 512, 512);
	
	// White text
	ctx.shadowBlur = 0;
	ctx.fillStyle = '#FFFFFF';
	ctx.fillText(scoreText, 512, 512);
	
	texture.update();
	return texture;
}

export function updateScoreTexture(texture: DynamicTexture, scoreLeft: number, scoreRight: number): void {
	const ctx = texture.getContext() as CanvasRenderingContext2D;
	
	// Background
	ctx.fillStyle = '#0a4d66';
	ctx.fillRect(0, 0, 1024, 1024);
	
	// Stripes
	ctx.fillStyle = '#083d52';
	for (let i = 0; i < 1024; i += 8) {
		ctx.fillRect(0, i, 1024, 4);
	}
	
	const scoreText = `${scoreLeft} - ${scoreRight}`;
	
	// Text properties
	ctx.font = 'bold 480px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	// Black outline
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 16;
	ctx.strokeText(scoreText, 512, 512);
	
	// Cyan glow
	ctx.shadowColor = '#00ffff';
	ctx.shadowBlur = 40;
	ctx.fillStyle = '#00ffff';
	ctx.fillText(scoreText, 512, 512);
	
	// White text
	ctx.shadowBlur = 0;
	ctx.fillStyle = '#FFFFFF';
	ctx.fillText(scoreText, 512, 512);
	
	texture.update();
}

export function loadScoreboard(scene: Scene): ScoreboardMeshes {
	// Parent
	const centerPoint = new Vector3(0, 7, 0);
	const scoreBoardParent = MeshBuilder.CreateBox('scoreBoardParent', { size: 0.1 }, scene);
	scoreBoardParent.position = centerPoint;
	scoreBoardParent.isVisible = false;
	
	// PANELS
	// Dimensions
	const panelWidth = 4;
	const panelHeight = panelWidth * (9 / 16);
	const panelDepth = 0.03;
	const distanceFromCenter = 3;
	const panelInclinement = -0.3;
	
	// Positions
	const panelConfigs = [
		{ name: 'scorePanel1', position: new Vector3(0, 0, distanceFromCenter), rotation: 0 },
		{ name: 'scorePanel2', position: new Vector3(distanceFromCenter, 0, 0), rotation: Math.PI / 2 },
		{ name: 'scorePanel3', position: new Vector3(0, 0, -distanceFromCenter), rotation: Math.PI },
		{ name: 'scorePanel4', position: new Vector3(-distanceFromCenter, 0, 0), rotation: -Math.PI / 2 }
	];
	const panels = [];
	const panelTextures: DynamicTexture[] = [];
	
	// Create panels
	for (const p of panelConfigs) {
		// Geometry
		const panel = MeshBuilder.CreateBox(p.name, { width: panelWidth, height: panelHeight, depth: panelDepth }, scene);
		
		// Material
		const holographicMaterial = new StandardMaterial(`${p.name}_holographicMat`, scene);
		const panelTexture = createScoreTexture(scene, 0, 0);
		
		// Texture
		panelTexture.vScale = 1;
		panelTexture.uScale = 1;
		
		// Colors
		holographicMaterial.diffuseTexture = panelTexture;
		holographicMaterial.diffuseColor = Color3.FromHexString('#0fb3ff');
		holographicMaterial.emissiveColor = Color3.FromHexString('#00d4ff');
		holographicMaterial.specularColor = Color3.White();
		holographicMaterial.alpha = 0.6;
		holographicMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
		holographicMaterial.backFaceCulling = true;
		
		// Transform
		panel.material = holographicMaterial;
		panel.position = p.position;
		panel.rotation.y = p.rotation + Math.PI;
		panel.rotation.x = panelInclinement;
		panel.parent = scoreBoardParent;
		panels.push(panel);
		panelTextures.push(panelTexture);
		
		// Border material
		const borderMaterial = new StandardMaterial(`${p.name}_borderMat`, scene);
		borderMaterial.diffuseColor = Color3.FromHexString('#192e38');
		borderMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05);
		
		// Border dimensions
		const borderThickness = 0.08;
		const borderDepth = panelDepth + 0.01;
		
		// Border positions
		const borders = [
			{ name: 'Top', width: panelWidth + borderThickness * 2, height: borderThickness, x: 0, y: panelHeight / 2 + borderThickness / 2 },
			{ name: 'Bottom', width: panelWidth + borderThickness * 2, height: borderThickness, x: 0, y: -panelHeight / 2 - borderThickness / 2 },
			{ name: 'Left', width: borderThickness, height: panelHeight, x: -panelWidth / 2 - borderThickness / 2, y: 0 },
			{ name: 'Right', width: borderThickness, height: panelHeight, x: panelWidth / 2 + borderThickness / 2, y: 0 }
		];
		
		// Create borders
		for (const border of borders) {
			const borderMesh = MeshBuilder.CreateBox(`${p.name}_border${border.name}`, { 
				width: border.width, 
				height: border.height, 
				depth: borderDepth 
			}, scene);
			borderMesh.material = borderMaterial;
			borderMesh.position = new Vector3(border.x, border.y, 0);
			borderMesh.parent = panel;
		}
	}

	// CYLINDER
	// Glass material
	const cylinderMidMaterial = new StandardMaterial('cylinderMidMat', scene);
	cylinderMidMaterial.diffuseColor = Color3.FromHexString('#0fb3ff');
	cylinderMidMaterial.specularColor = Color3.White();
	cylinderMidMaterial.alpha = 0.4;
	cylinderMidMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
	cylinderMidMaterial.backFaceCulling = false;
	
	// Inner material
	const cylinderMidInnerMaterial = new StandardMaterial('cylinderMidInnerMat', scene);
	cylinderMidInnerMaterial.diffuseColor = Color3.Black();
	cylinderMidInnerMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
	
	// Border materials
	const cylinderTopBorderMaterial = new StandardMaterial('cylinderTopBorderMat', scene);
	const cylinderBottomBorderMaterial = new StandardMaterial('cylinderBottomBorderMat', scene);
	cylinderTopBorderMaterial.diffuseColor = Color3.FromHexString('#8fdbff');
	cylinderTopBorderMaterial.emissiveColor = Color3.FromHexString('#0fb3ff');
	cylinderTopBorderMaterial.specularColor = Color3.White();
	cylinderBottomBorderMaterial.diffuseColor = Color3.FromHexString('#8fdbff');
	cylinderBottomBorderMaterial.emissiveColor = Color3.FromHexString('#0fb3ff');
	cylinderBottomBorderMaterial.specularColor = Color3.White();

	// Geometry
	const cylinderMid = MeshBuilder.CreateCylinder('cylinderMid', { diameterTop: 3, diameterBottom:2.5, height: 0.5, tessellation: 32 }, scene);
	const cylinderMidInner = MeshBuilder.CreateCylinder('cylinderMidInner', { diameterTop: 2.5, diameterBottom:2., height: 0.5, tessellation: 32 }, scene);
	const cylinderTopBorder = MeshBuilder.CreateCylinder('cylinderTopBorder', { diameter:3.1, height: 0.04, tessellation: 32 }, scene);
	const cylinderBottomBorder = MeshBuilder.CreateCylinder('cylinderBottomBorder', { diameter: 2.6, height: 0.04, tessellation: 32 }, scene);
	
	// Apply materials
	cylinderMid.material = cylinderMidMaterial;
	cylinderMidInner.material = cylinderMidInnerMaterial;
	cylinderTopBorder.material = cylinderTopBorderMaterial;
	cylinderBottomBorder.material = cylinderBottomBorderMaterial;

	// Positions
	cylinderTopBorder.position = new Vector3(0, 0.25, 0);
	cylinderBottomBorder.position = new Vector3(0, -0.25, 0);

	// Parenting
	cylinderMid.parent = scoreBoardParent;
	cylinderMidInner.parent = scoreBoardParent;
	cylinderTopBorder.parent = scoreBoardParent;
	cylinderBottomBorder.parent = scoreBoardParent;

	return {
		parent: scoreBoardParent,
		panels,
		panelTextures
	};
}

export function createGoalCelebrationParticles(scene: Scene, sphereCelebration: Mesh): ParticleSystem {
	const particleSystem = new ParticleSystem('goalParticles', 3000, scene);
	const particleTexture = new DynamicTexture('particleTexture', 64, scene, false);
	const ctx = particleTexture.getContext() as CanvasRenderingContext2D;
	const centerX = 32;
	const centerY = 32;
	const radius = 30;
	const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
	gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
	gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
	gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
	gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.1)');
	gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 64, 64);
	particleTexture.update();
	particleSystem.particleTexture = particleTexture;
	
	particleSystem.emitter = sphereCelebration;
	particleSystem.createSphereEmitter(74.5, 0); // Radius 74.5 (149/2), radiusRange 0 = surface only
	particleSystem.color1 = new Color4(2, 2, 2, 1);
	particleSystem.color2 = new Color4(2, 2, 2, 1);
	particleSystem.colorDead = new Color4(1, 1, 1, 0);
	particleSystem.minSize = 0.3;
	particleSystem.maxSize = 0.8;
	particleSystem.minLifeTime = 0.2;
	particleSystem.maxLifeTime = 0.4;
	particleSystem.emitRate = 1500;
	particleSystem.minEmitPower = 0;
	particleSystem.maxEmitPower = 0;
	particleSystem.updateSpeed = 0.02;
	particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
	particleSystem.stop();
	return particleSystem;
}

export function triggerGoalCelebration(particleSystem: ParticleSystem, sphereCelebration: Mesh, side: 'left' | 'right'): void {
	const material = sphereCelebration.material as StandardMaterial;
	material.alpha = 0;
	particleSystem.start();
	setTimeout(() => {
		particleSystem.stop();
	}, 2000);
}
