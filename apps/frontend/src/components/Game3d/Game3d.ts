import '@babylonjs/loaders'; // for gltf
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, SceneLoader, StandardMaterial, Color3 } from '@babylonjs/core';

export function initGame3d() {
	
	class Game3d {
		// Babylon.js core objects
		private canvas: HTMLCanvasElement;
		private engine: Engine;
		private scene: Scene;
		
		// Camera and lights
		private camera: ArcRotateCamera;
		
		// Assets
		// private imported_ground: any;
		// private imported_border_border: any;
		private imported_stadium: any;
		
		constructor(canvasId: string) {
			// Get canvas
			const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			if (!canvas) throw new Error(`Canvas with id ${canvasId} not found`);
			this.canvas = canvas;
			
			// Initialize engine and scene
			this.engine = new Engine(this.canvas, true);
			this.scene = new Scene(this.engine);
			
			// Setup camera and lights
			this.setupCamera();
			this.setupLights();
			
			// Load assets and start
			this.loadAssets();
			this.start();
		}

		private setupCamera() {
			this.camera = new ArcRotateCamera('camera', 0, 0, 10, Vector3.Zero(), this.scene);
			this.camera.attachControl(this.canvas, true);
		}
		
		private setupLights() {
			new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
		}

		// private async loadAssets() {
		// 	// sphere
		// 	this.sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, this.scene);
		// 	this.sphere.position = new Vector3(0, 10, 0);
			
		// 	const sphereMaterial = new StandardMaterial('sphereMat', this.scene);
		// 	sphereMaterial.diffuseColor = new Color3(1, 0, 0);
		// 	this.sphere.material = sphereMaterial;

		// 	// APPEND 3D MODELS
		// 	// ground
		// 	await SceneLoader.AppendAsync('/assets/models/', 'ground.gltf', this.scene);
		// 	await SceneLoader.AppendAsync('/assets/models/', 'border_ground.gltf', this.scene);
		// 	// CREATE MATERIAL
		// 	const groundMaterial = new StandardMaterial('groundMat', this.scene);
		// 	const borderGroundMaterial = new StandardMaterial('borderGroundMat', this.scene);


		// 	this.imported_ground = this.scene.getMeshByName('ground');
		// 	if (this.imported_ground) {
		// 		// PROPERTIES
		// 		// MATERIAL
		// 		groundMaterial.diffuseColor = new Color3(0, 1, 0);
		// 		this.imported_ground.material = groundMaterial;
		// 	}
		// 	this.imported_border_border = this.scene.getMeshByName('border_ground');
		// 	if (this.imported_border_border) {
		// 		// PROPERTIES
		// 		// MATERIAL
		// 		borderGroundMaterial.diffuseColor = new Color3(0, 1, 1);
		// 		this.imported_border_border.material = borderGroundMaterial;
		// 	}
		// }

		private async loadAssets() {
			await SceneLoader.AppendAsync('/assets/models/', 'stadium.gltf', this.scene);
			
			// Debug: See all loaded meshes with hierarchy
			console.log('=== LOADED MESHES ===');
			this.scene.meshes.forEach(mesh => {
				console.log(`Mesh: "${mesh.name}", Parent: "${mesh.parent?.name || 'none'}", Material: ${mesh.material?.name || 'none'}`);
			});
			
			// Find and apply materials to meshes
			const ground = this.scene.getMeshByName('ground');
			
			// Look for the group and its children
			const groupBorder = this.scene.getTransformNodeByName('group_border') || this.scene.getMeshByName('group_border');
			
			// Ground material
			if (ground) {
				const groundMaterial = new StandardMaterial('groundMat', this.scene);
				groundMaterial.diffuseColor = new Color3(0, 1, 0); // Green
				ground.material = groundMaterial;
				console.log('✅ Applied green to ground');
			} else {
				console.log('❌ Ground mesh not found!');
			}
			
			// Border material - apply to all meshes in the border group
			const borderMaterial = new StandardMaterial('borderMat', this.scene);
			borderMaterial.diffuseColor = new Color3(1, 1, 0); // Yellow
			
			// Try finding by exact names
			const borderGround = this.scene.getMeshByName('border_ground');
			const test = this.scene.getMeshByName('test');
			
			if (borderGround) {
				borderGround.material = borderMaterial;
				console.log('✅ Applied yellow to border_ground');
			}
			
			if (test) {
				test.material = borderMaterial;
				console.log('✅ Applied yellow to test');
			}
			
			// Also apply to all children of group_border if it exists
			if (groupBorder) {
				groupBorder.getChildMeshes().forEach(child => {
					child.material = borderMaterial;
					console.log('✅ Applied yellow to group child:', child.name);
				});
			}
			
			// Fallback: Apply to anything with "border" or "test" in the name
			this.scene.meshes.forEach(mesh => {
				const name = mesh.name.toLowerCase();
				if ((name.includes('border') || name.includes('test')) && mesh.name !== 'ground') {
					mesh.material = borderMaterial;
					console.log('✅ Applied yellow (fallback) to:', mesh.name);
				}
			});
		}
		private start() {
			this.engine.runRenderLoop(() => {
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
		<div class="container ml-auto mr-auto flex flex-col items-center" data-component="game3d">
			<div class="w-full flex justify-between items-center px-8 mb-4">
				<div id="player-left-name" class="text-xl font-bold">Player 1</div>
				<button id="forfeit-btn" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
					Surrender
				</button>
				<div id="player-right-name" class="text-xl font-bold">Player 2</div>
			</div>
			<canvas id="game3d-canvas" class="w-full h-[600px] border border-gray-300"></canvas>
		</div>
	`;
}
