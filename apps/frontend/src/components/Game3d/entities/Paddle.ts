import { MeshBuilder, Vector3, StandardMaterial, Color3, Scene } from '@babylonjs/core';
import { PADDLE_3D, MATERIALS } from '../constants';
import { Entity } from './Entity';
import type { PaddleState } from '../types';

export class Paddle extends Entity {
	private side: 'left' | 'right'; 

	constructor(scene: Scene, side: 'left' | 'right') {
		super(scene, `paddle-${side}`);
		this.side = side;
		this.createMesh();
	}
	
	private createMesh(): void {
		this.mesh = MeshBuilder.CreateBox(
			this.id, {
				width: PADDLE_3D.X * PADDLE_3D.SCALE_3D,
				height: PADDLE_3D.Y * PADDLE_3D.SCALE_3D,
				depth: PADDLE_3D.Z * PADDLE_3D.SCALE_3D
			}, this.scene);

		const xPos = this.side === 'left' ? (-PADDLE_3D.START_POSX - PADDLE_3D.MARGIN) * PADDLE_3D.SCALE_3D  : (PADDLE_3D.START_POSX + PADDLE_3D.MARGIN) * PADDLE_3D.SCALE_3D 
		this.mesh.position = new Vector3(xPos, PADDLE_3D.START_POSY * PADDLE_3D.SCALE_3D, PADDLE_3D.START_POSZ * PADDLE_3D.SCALE_3D);

		const material = new StandardMaterial(`paddle-mat-${this.side}`, this.scene);
		material.diffuseColor = Color3.FromHexString(MATERIALS.PADDLE_COLOR);
		this.mesh.material = material;
	}

	public updateFromState(state: PaddleState, smashOffsetX?: number): void {
		if (!this.mesh) return;
		
		this.mesh.position.z = -(state.y - 540) * 0.01;

		// SMASH OFFSET de l'enfer
		const xPos = this.side === 'left' ? (-PADDLE_3D.START_POSX - PADDLE_3D.MARGIN) * PADDLE_3D.SCALE_3D  : (PADDLE_3D.START_POSX + PADDLE_3D.MARGIN) * PADDLE_3D.SCALE_3D 
		this.mesh.position.x = xPos + (smashOffsetX || 0);
	}

	public update(): void {
		if (!this.mesh) return;
	}

	public static getPaddleIntention(keys: { [key: string]: boolean }, side: 'left' | 'right'): number {
		if (side === 'left') {
			if (keys['w'] || keys['a']) return 1;
			if (keys['s'] || keys['d']) return -1;
		} else {
			if (keys['w'] || keys['d']) return 1;
			if (keys['s'] || keys['a']) return -1;
		}
		return 0;
	}

	public dispose(): void {
		super.dispose();
	}
}
