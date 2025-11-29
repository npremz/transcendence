import { Entity } from "./Entity";
import { MeshBuilder, StandardMaterial, Color4, Scene, Mesh, ParticleSystem, DynamicTexture } from "@babylonjs/core";

export class CelebrationSphere extends Entity {
	private particleSystem?: ParticleSystem;
	private timeoutId?: number;

	constructor(scene: Scene, id: string = 'celebration-sphere') {
		super(scene, id);
		this.createMesh();
		this.createParticleSystem();
	}

	private createMesh(): void {
		const sphereCelebration = MeshBuilder.CreateSphere('sphereCelebration', { diameter: 149, sideOrientation: Mesh.BACKSIDE }, this.scene);
		const sphereCelebrationMaterial = new StandardMaterial('sphereCelebrationMat', this.scene);
		sphereCelebrationMaterial.alpha = 0;
		sphereCelebrationMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
		sphereCelebration.material = sphereCelebrationMaterial;
		this.mesh = sphereCelebration;
	}

	private createParticleSystem(): void {
		if (!this.mesh) return;
		const particleSystem = new ParticleSystem('celebrationParticles', 3000, this.scene);
		const particleTexture = new DynamicTexture('particleTexture', 64, this.scene, false);
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

		particleSystem.emitter = this.mesh;
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
		// particleSystem.stop();
		this.particleSystem = particleSystem;
	}
	
	public update(): void {
		if (!this.mesh) return;
		const material = this.mesh.material as StandardMaterial;
		material.alpha = 0;
		this.particleSystem?.start();
		this.timeoutId = setTimeout(() => {
			this.particleSystem?.stop();
		}, 2000);
	}

	public dispose(): void {
		if (this.particleSystem) {
			const texture = this.particleSystem.particleTexture as DynamicTexture;
			this.particleSystem.dispose();
			if (texture) texture.dispose();
			this.particleSystem = undefined;
		}

		if (this.mesh) {
			const material = this.mesh.material as StandardMaterial;
			if (material) material.dispose();
			this.mesh.dispose();
			this.mesh = undefined as any;
		}

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = undefined;
		}
		super.dispose();
	}
}
