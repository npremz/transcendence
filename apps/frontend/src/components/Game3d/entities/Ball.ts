import type { Scene } from "@babylonjs/core/scene";
import { Entity } from "./Entity";
import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";
import type { BallState } from "../types";
import { BALL_3D } from "../constants";

export class Ball extends Entity {
	private targetPosition: Vector3;
	constructor(scene: Scene, id: string) {
		super(scene, id);
		this.targetPosition = new Vector3(0, 0, 0);
		// this.targetPosition = new Vector3(BALL_3D.START_POSX, BALL_3D.START_POSY, BALL_3D.START_POSZ);
		this.createMesh();
	}

	private createMesh(): void {
		this.mesh = MeshBuilder.CreateSphere(this.id, { diameter: BALL_3D.DIAMETER * BALL_3D.SCALE_3D }, this.scene);
		const material = new StandardMaterial(`ball-mat-${this.id}`, this.scene);
		material.diffuseColor = Color3.FromHexString('#FFFFFF');
		this.mesh.material = material;
	}

	public updateFromState(state: BallState): void {
		this.targetPosition.set(state.x, state.y, state.z);
	}

	public update(): void {
		// Update logic for the ball
		if (!this.mesh) return;
	}

	public dispose(): void {
		super.dispose();
	}
}
