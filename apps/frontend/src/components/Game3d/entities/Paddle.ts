import { Meshbuilder, Vector3, StandardMaterial, Color3, Scene } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import { PADDLE_3D, MATERIALS } from '../constants';

export class Paddle {
	private mesh: Mesh;
	private scene: Scene;
	public y: number = 0;
	public speed: number = 0;
	
	constructor(scene: Scene, side: 'left' | 'right') {
		this.scene = scene;
		this.mesh = Meshbuilder.CreateBox(`paddle-${side}`, {
			width: PADDLE_3D.WIDTH,
			height: PADDLE_3D.HEIGHT,
			depth: PADDLE_3D.DEPTH
		}, scene);

		const xPos = side === 'left' ? -900 : 900;
		this.mesh.position = new Vector3(xPos, 0, 0);

		const material = new StandardMaterial(`paddle-mat-${side}`, scene);
		material.diffuseColor = Color3.FromHexString(MATERIALS.PADDLE_COLOR	);
		this.mesh.material = material;
	}

	update(newY: number, speed: number): void {
		this.y = newY;
		this.speed = speed;
		this.mesh.position.y = newY;
	}
	getMesh(): Mesh {
		return this.mesh;
	}
	
	dispose(): void {
		if (this.mesh) {
			this.mesh.material.dispose();
		}
		this.mesh.dispose();
	}
}
