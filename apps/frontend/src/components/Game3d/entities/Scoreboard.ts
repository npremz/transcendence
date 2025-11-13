import { Entity } from "./Entity";
import type { Scene } from "@babylonjs/core/scene";
import { Color3, DynamicTexture, Mesh, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";

export class Scoreboard extends Entity {
	private panelTextures: DynamicTexture[] = [];
	private panels: Mesh[] = [];
	private parentMesh!: Mesh;

	constructor(scene: Scene, id: string = 'scoreboard') {
		super(scene, id);
		this.createMesh();
	}

	private createMesh(): void {
		// Parent container
		const centerPoint = new Vector3(0, 7, 0);
		this.parentMesh = MeshBuilder.CreateBox('scoreBoardParent', { size: 0.1 }, this.scene);
		this.parentMesh.position = centerPoint;
		this.parentMesh.isVisible = false;
		this.mesh = this.parentMesh;

		// Create panels and cylinder
		this.createPanels();
		this.createCylinder();
	}

	private createPanels(): void {
		// Dimensions
		const panelWidth = 4;
		const panelHeight = panelWidth * (9 / 16);
		const panelDepth = 0.03;
		const distanceFromCenter = 3;
		const panelInclinement = -0.3;

		// Panel configurations
		const panelConfigs = [
			{ name: 'scorePanel1', position: new Vector3(0, 0, distanceFromCenter), rotation: 0 },
			{ name: 'scorePanel2', position: new Vector3(distanceFromCenter, 0, 0), rotation: Math.PI / 2 },
			{ name: 'scorePanel3', position: new Vector3(0, 0, -distanceFromCenter), rotation: Math.PI },
			{ name: 'scorePanel4', position: new Vector3(-distanceFromCenter, 0, 0), rotation: -Math.PI / 2 }
		];

		// Create each panel
		for (const config of panelConfigs) {
			const panel = this.createPanel(config, panelWidth, panelHeight, panelDepth, panelInclinement);
			this.panels.push(panel);
		}
	}

	private createPanel(
		config: { name: string; position: Vector3; rotation: number },
		width: number,
		height: number,
		depth: number,
		inclinement: number
	): Mesh {
		// Create panel geometry
		const panel = MeshBuilder.CreateBox(config.name, { width, height, depth }, this.scene);

		// Create holographic material
		const holographicMaterial = new StandardMaterial(`${config.name}_holographicMat`, this.scene);
		const panelTexture = this.panelTextures.length === 0 
			? this.createScoreTexture(0, 0) 
			: this.panelTextures[0];

		// Configure texture
		panelTexture.vScale = 1;
		panelTexture.uScale = 1;

		// Configure material
		holographicMaterial.diffuseTexture = panelTexture;
		holographicMaterial.diffuseColor = Color3.FromHexString('#0fb3ff');
		holographicMaterial.emissiveColor = Color3.FromHexString('#00d4ff');
		holographicMaterial.specularColor = Color3.White();
		holographicMaterial.alpha = 0.6;
		holographicMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
		holographicMaterial.backFaceCulling = true;

		// Apply transforms
		panel.material = holographicMaterial;
		panel.position = config.position;
		panel.rotation.y = config.rotation + Math.PI;
		panel.rotation.x = inclinement;
		panel.parent = this.parentMesh;

		// Store texture reference (only once since we share it)
		if (this.panelTextures.length === 0) {
			this.panelTextures.push(panelTexture);
		}

		// Create panel borders
		this.createPanelBorders(panel, width, height, depth);

		return panel;
	}

	private createPanelBorders(panel: Mesh, panelWidth: number, panelHeight: number, panelDepth: number): void {
		// Border material
		const borderMaterial = new StandardMaterial(`${panel.name}_borderMat`, this.scene);
		borderMaterial.diffuseColor = Color3.FromHexString('#192e38');
		borderMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05);

		// Border dimensions
		const borderThickness = 0.08;
		const borderDepth = panelDepth + 0.01;

		// Border configurations
		const borders = [
			{ name: 'Top', width: panelWidth + borderThickness * 2, height: borderThickness, x: 0, y: panelHeight / 2 + borderThickness / 2 },
			{ name: 'Bottom', width: panelWidth + borderThickness * 2, height: borderThickness, x: 0, y: -panelHeight / 2 - borderThickness / 2 },
			{ name: 'Left', width: borderThickness, height: panelHeight, x: -panelWidth / 2 - borderThickness / 2, y: 0 },
			{ name: 'Right', width: borderThickness, height: panelHeight, x: panelWidth / 2 + borderThickness / 2, y: 0 }
		];

		// Create each border
		for (const border of borders) {
			const borderMesh = MeshBuilder.CreateBox(
				`${panel.name}_border${border.name}`,
				{ width: border.width, height: border.height, depth: borderDepth },
				this.scene
			);
			borderMesh.material = borderMaterial;
			borderMesh.position = new Vector3(border.x, border.y, 0);
			borderMesh.parent = panel;
		}
	}

	private createCylinder(): void {
		// Glass material
		const cylinderMidMaterial = new StandardMaterial('cylinderMidMat', this.scene);
		cylinderMidMaterial.diffuseColor = Color3.FromHexString('#0fb3ff');
		cylinderMidMaterial.specularColor = Color3.White();
		cylinderMidMaterial.alpha = 0.4;
		cylinderMidMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
		cylinderMidMaterial.backFaceCulling = false;

		// Inner material
		const cylinderMidInnerMaterial = new StandardMaterial('cylinderMidInnerMat', this.scene);
		cylinderMidInnerMaterial.diffuseColor = Color3.Black();
		cylinderMidInnerMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

		// Border materials
		const cylinderTopBorderMaterial = new StandardMaterial('cylinderTopBorderMat', this.scene);
		const cylinderBottomBorderMaterial = new StandardMaterial('cylinderBottomBorderMat', this.scene);
		cylinderTopBorderMaterial.diffuseColor = Color3.FromHexString('#8fdbff');
		cylinderTopBorderMaterial.emissiveColor = Color3.FromHexString('#0fb3ff');
		cylinderTopBorderMaterial.specularColor = Color3.White();
		cylinderBottomBorderMaterial.diffuseColor = Color3.FromHexString('#8fdbff');
		cylinderBottomBorderMaterial.emissiveColor = Color3.FromHexString('#0fb3ff');
		cylinderBottomBorderMaterial.specularColor = Color3.White();

		// Create geometry
		const cylinderMid = MeshBuilder.CreateCylinder('cylinderMid', { diameterTop: 3, diameterBottom: 2.5, height: 0.5, tessellation: 32 }, this.scene);
		const cylinderMidInner = MeshBuilder.CreateCylinder('cylinderMidInner', { diameterTop: 2.5, diameterBottom: 2., height: 0.5, tessellation: 32 }, this.scene);
		const cylinderTopBorder = MeshBuilder.CreateCylinder('cylinderTopBorder', { diameter: 3.1, height: 0.04, tessellation: 32 }, this.scene);
		const cylinderBottomBorder = MeshBuilder.CreateCylinder('cylinderBottomBorder', { diameter: 2.6, height: 0.04, tessellation: 32 }, this.scene);

		// Apply materials
		cylinderMid.material = cylinderMidMaterial;
		cylinderMidInner.material = cylinderMidInnerMaterial;
		cylinderTopBorder.material = cylinderTopBorderMaterial;
		cylinderBottomBorder.material = cylinderBottomBorderMaterial;

		// Set positions
		cylinderTopBorder.position = new Vector3(0, 0.25, 0);
		cylinderBottomBorder.position = new Vector3(0, -0.25, 0);

		// Parent to scoreboard
		cylinderMid.parent = this.parentMesh;
		cylinderMidInner.parent = this.parentMesh;
		cylinderTopBorder.parent = this.parentMesh;
		cylinderBottomBorder.parent = this.parentMesh;
	}

	private createScoreTexture(scoreLeft: number = 0, scoreRight: number = 0): DynamicTexture {
		const texture = new DynamicTexture('scoreTexture', { width: 1024, height: 1024 }, this.scene, false);
		this.updateScoreTexture(texture, scoreLeft, scoreRight);
		return texture;
	}

	private updateScoreTexture(texture: DynamicTexture, scoreLeft: number, scoreRight: number): void {
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
		ctx.fillStyle = '#00d4ff';
		ctx.fillText(scoreText, 512, 512);

		// White text
		ctx.shadowBlur = 0;
		ctx.fillStyle = '#FFFFFF';
		ctx.fillText(scoreText, 512, 512);

		texture.update();
	}

	public updateScore(scoreLeft: number, scoreRight: number): void {
		if (this.panelTextures.length > 0) {
			this.updateScoreTexture(this.panelTextures[0], scoreLeft, scoreRight);
		}
	}

	/**
	 * Required by Entity abstract class
	 */
	public update(): void {
		// Scoreboard doesn't need per-frame updates
		// Score updates are handled via updateScore() method
	}

	public dispose(): void {
		// Dispose textures
		for (const texture of this.panelTextures) {
			texture.dispose();
		}
		this.panelTextures = [];
		this.panels = [];

		// Call parent dispose
		super.dispose();
	}
}
