import type { Scene } from "@babylonjs/core/scene";
import { Entity } from "./Entity";
import { Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import type { BallState } from "../types";
import { BALL_3D } from "../constants";

export class Ball extends Entity {
	constructor(scene: Scene, id: string) {
		super(scene, id);
		this.createMesh();
	}

	private createMesh(): void {
		this.mesh = MeshBuilder.CreateSphere(this.id, { diameter: BALL_3D.DIAMETER * BALL_3D.SCALE_3D }, this.scene);
		const material = new StandardMaterial(`ball-mat-${this.id}`, this.scene);
		material.diffuseColor = Color3.FromHexString('#FFFFFF');
		this.mesh.material = material;
	}

	public updateFromState(state: BallState): void {
		if (!this.mesh) return;
		const x3d = this.converter2DXto3DX(state.x);
		const z3d = this.converter2DYto3DZ(state.y);

		this.mesh.position.x = x3d;
		this.mesh.position.y = BALL_3D.START_POSY * BALL_3D.SCALE_3D;
		this.mesh.position.z = z3d;
	}
	
	private converter2DXto3DX(x2d: number): number {
		return (x2d - 1920 / 2) * BALL_3D.SCALE_3D;
	}

	private converter2DYto3DZ(y2d: number): number {
		return -(y2d - 1080 / 2) * BALL_3D.SCALE_3D;
	}

	public update(): void {
		if (!this.mesh) return;
	}

	public dispose(): void {
		super.dispose();
	}
}
