import { Scene, Mesh, Vector3 } from '@babylonjs/core';
import type { IEntity, IRenderable } from '../types';

// base class for 3D entities
export abstract class Entity implements IEntity, IRenderable {
	public id: string;
	public mesh?: Mesh
	public position: Vector3;
	protected scene: Scene;
	protected isDisposed: boolean = false;
	
	constructor(scene: Scene, id: string) {
		this.scene = scene;
		this.id = id;
		this.position = new Vector3(0, 0, 0);
	}

	abstract update(): void;

	public setPosition(x: number, y: number, z: number): void {
		this.position.set(x, y, z);
		if (this.mesh) {
			this.mesh.position.copyFrom(this.position);
		}
	}

	public setVisibility(visible: boolean): void {
		if (this.mesh) {
			this.mesh.isVisible = visible;
		}
	}

	public render(): void {}

	public isEntityDisposed(): boolean {
		return this.isDisposed;
	}

	public dispose(): void {
		if (this.isDisposed) return;
		this.isDisposed = true;
		if (this.mesh) {
			if (this.mesh.material) {
				this.mesh.material.dispose();
			}
			this.mesh.dispose();
			this.mesh = undefined;
		}
	}
}
