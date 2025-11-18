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
		this.mesh = MeshBuilder.CreateCylinder(this.id, { 
			diameter: this.state.radius * 2 * 0.01, 
			height: 1, 
			tessellation: 32
		}, this.scene);
		
		const material = new StandardMaterial(`powerup-mat-${this.id}`, this.scene);
		material.needDepthPrePass = true;
		material.backFaceCulling = false;
		material.alpha = 0.7;

		switch (this.type) {
			case 'split':
				material.diffuseColor = Color3.FromHexString('#FFD700');
				material.emissiveColor = Color3.FromHexString('#FFD700').scale(0.6);
				material.specularColor = Color3.FromHexString('#FFEA00');
				break;
			case 'blackout':
				material.diffuseColor = Color3.FromHexString('#9B59B6');
				material.emissiveColor = Color3.FromHexString('#9B59B6').scale(0.7);
				material.specularColor = Color3.FromHexString('#E74FF0');
				break;
			case 'blackhole':
				material.diffuseColor = Color3.FromHexString('#000000');
				material.emissiveColor = Color3.FromHexString('#111111').scale(0.6);
				material.specularColor = Color3.FromHexString('#333333');
				break;
		}
		this.mesh.material = material;
	}

	public updateState(state: {x: number; y: number; radius: number; type: string}): void {
		this.state = state;
	}

	public update(): void {
		if (!this.mesh) return;
		
		const time = Date.now() * 0.001;
		
		const floatOffset = Math.sin(time * 3) * 0.15;
		this.mesh.position.x = powerUpConverter2DXto3DX(this.state.x);
		this.mesh.position.z = powerUpConverter2DYto3DZ(this.state.y);
		this.mesh.position.y = 0.9 + floatOffset;
		
		this.mesh.rotation.y += 0.015;
		
		const pulse = 1 + Math.sin(time * 4) * 0.05;
		this.mesh.scaling.set(pulse, 1, pulse);
	}

	public dispose(): void {
		super.dispose();
	}
}
