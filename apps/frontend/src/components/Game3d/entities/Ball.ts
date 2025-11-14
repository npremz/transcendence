import type { Scene } from "@babylonjs/core/scene";
import { Entity } from "./Entity";
import { Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import type { BallState } from "../types";
import { BALL_3D } from "../constants";
import { ballConverter2DXto3DX, ballConverter2DYto3DZ } from "../utils/mathHelper";

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
		const x3d = ballConverter2DXto3DX(state.x);
		const z3d = ballConverter2DYto3DZ(state.y);

		this.mesh.position.x = x3d;
		this.mesh.position.y = BALL_3D.START_POSY * BALL_3D.SCALE_3D;
		this.mesh.position.z = z3d;
	}

	public update(): void {
		if (!this.mesh) return;
	}

	public dispose(): void {
		super.dispose();
	}
}
