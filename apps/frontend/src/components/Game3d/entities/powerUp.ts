import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { Entity } from "./Entity";
import { powerUpConverter2DXto3DX, powerUpConverter2DYto3DZ } from "../utils/mathHelper";

export class PowerUp extends Entity {
	private type: 'blackout' | 'split' | 'blackhole';
	private state: {x: number; y: number; radius: number; type: string};

	constructor(scene: Scene, id: string, state: {x: number; y: number; radius: number; type: string}) {
		super(scene, id);
		this.state = state;
		this.type = state.type as 'blackout' | 'split' | 'blackhole';
		this.createMesh();
	}
	private createMesh(): void {
		// create a cylinder - use BALL_3D.SCALE_3D to match coordinate system
		this.mesh = MeshBuilder.CreateCylinder(this.id, { diameter: this.state.radius * 2 * 0.01, height: 1 }, this.scene);
		const material = new StandardMaterial(`powerup-mat-${this.id}`, this.scene);

		switch (this.type) {
			case 'split':
				material.diffuseColor = Color3.FromHexString('#FFD700'); // Gold
				material.emissiveColor = Color3.FromHexString('#FFD700').scale(0.3);
				break;
			case 'blackout':
				material.diffuseColor = Color3.FromHexString('#9B59B6'); // Purple
				material.emissiveColor = Color3.FromHexString('#9B59B6').scale(0.3);
				break;
			case 'blackhole':
				material.diffuseColor = Color3.FromHexString('#20054b'); // Dark blue
				material.emissiveColor = Color3.FromHexString('#0ea5e9').scale(0.5);
				break;
		}
		this.mesh.material = material;
	}

	public updateState(state: {x: number; y: number; radius: number; type: string}): void {
		this.state = state;
	}

	public update(): void {
		// maybe for the animation
		if (!this.mesh) return;
		this.mesh.position.x = powerUpConverter2DXto3DX(this.state.x);
		this.mesh.position.z = powerUpConverter2DYto3DZ(this.state.y);
		this.mesh.position.y = 1;
		// float
		this.mesh.position.y += Math.sin(Date.now() * 0.003) * 0.2;
	}

	public dispose(): void {
		super.dispose();
	}
}
