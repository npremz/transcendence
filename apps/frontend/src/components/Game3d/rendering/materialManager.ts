import type { Scene, StandardMaterial } from "@babylonjs/core";

export class MaterialManager {
	private scene: Scene;
	private materials: Map<string, StandardMaterial> = new Map();

	constructor(scene: Scene) {
		this.scene = scene;
	}

	public dispose(): void {
		this.materials.forEach((material) => {
			material.dispose();
		});
		this.materials.clear();
	}
}
