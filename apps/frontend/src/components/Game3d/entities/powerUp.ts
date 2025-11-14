import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { Entity } from "./Entity";
import { POWERUP_3D } from "../constants";
import type { PowerUpState } from "../types";

export class PowerUps extends Entity {
	private type: 'blackout' | 'split' | 'blackhole';

	constructor(scene: Scene, id: string, type: 'blackout' | 'split' | 'blackhole') {
		super(scene, id);
		this.type = type;
		this.createMesh();
	}
	private createMesh(): void {
		// create a cylinder
		this.mesh = MeshBuilder.CreateCylinder(this.id, { diameter: POWERUP_3D.RADIUS * 2, height: POWERUP_3D.HEIGHT }, this.scene);
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
}
