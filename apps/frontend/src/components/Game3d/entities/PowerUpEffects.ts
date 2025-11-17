import { 
	Scene, Mesh, MeshBuilder, StandardMaterial, Color3, 
	ParticleSystem, Vector3, Color4, Animation
} from "@babylonjs/core";
import { Paddle } from "./Paddle";

/**
 * Manages spectacular visual effects when power-ups are activated
 */
export class PowerUpEffects {
	private scene: Scene;
	private blackholeEffect?: {
		borderMesh: Mesh;
		innerMesh: Mesh;
		helixMesh: Mesh;
	};

	constructor(scene: Scene) {
		this.scene = scene;
		this.blackholeEffect = {
			borderMesh: this.scene.getMeshByName("centerCircle") as Mesh,
			innerMesh: this.scene.getMeshByName("centerCircleInner") as Mesh,
			helixMesh: this.scene.getMeshByName("blacholeHelix") as Mesh,
		};
		// // lit
		const helix = this.blackholeEffect.helixMesh;
		const helixMaterial = new StandardMaterial("helix-mat", this.scene);
		helixMaterial.diffuseColor = Color3.FromHexString('#0ea5e9');
		helixMaterial.emissiveColor = Color3.FromHexString('#0ea5e9').scale(0.8);
		helixMaterial.specularColor = Color3.FromHexString('#38bdf8');
		helix.material = helixMaterial;

	}

	public activateBlackoutEffect(side: 'left' | 'right'): void {
		this.scene.meshes.forEach(mesh => {
			// keep balls and opposite paddle visible
			if (mesh.name.startsWith('ball')) return;
			if (side === 'right' && mesh.name === 'paddle-right') return;
			if (side === 'left' && mesh.name === 'paddle-left') return;
			if (mesh.name === 'centerCircle') return;
			if (mesh.name.startsWith('line')) return;
			if (!mesh.isDisposed()) {
				mesh.isVisible = false;
			}
		});
	}

	public restoreVisibilityAfterBlackout(): void {
		this.scene.meshes.forEach(mesh => {
			if (!mesh.isDisposed()) {
				mesh.isVisible = true;
			}
		});
	}

	public triggerBlackholeEffect(): void {
		if (!this.blackholeEffect) return;
		const inner = this.blackholeEffect.innerMesh;
		const border = this.blackholeEffect.borderMesh;
		const helix = this.blackholeEffect.helixMesh;

		if (inner.material && inner.material instanceof StandardMaterial) {
			const alphaAnim = new Animation("blackhole-inner-alpha-in", "alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
			alphaAnim.setKeys([
				{ frame: 0, value: inner.material.alpha },
				{ frame: 30, value: 1 }
			]);
			inner.material.animations = [alphaAnim];
			this.scene.beginAnimation(inner.material, 0, 30, false);
		}

		if (helix.material && helix.material instanceof StandardMaterial) {
			const alphaAnim = new Animation("blackhole-helix-alpha-in", "alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
			alphaAnim.setKeys([
				{ frame: 0, value: helix.material.alpha },
				{ frame: 30, value: 1 }
			]);
			helix.material.animations = [alphaAnim];
			this.scene.beginAnimation(helix.material, 0, 30, false);
		}

		if (border.material && border.material instanceof StandardMaterial) {
			const colorAnim = new Animation("blackhole-core-to-black", "diffuseColor", 30, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
			colorAnim.setKeys([
				{ frame: 0, value: (border.material as StandardMaterial).diffuseColor },
				{ frame: 30, value: Color3.Black() }
			]);
			border.material.animations = [colorAnim];
			this.scene.beginAnimation(border.material, 0, 30, false);
		}

		const scaleAnim = new Animation("blackhole-scale-up", "scaling", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
		scaleAnim.setKeys([
			{ frame: 0, value: new Vector3(1, 1, 1) },
			{ frame: 30, value: new Vector3(5, 5, 5) }
		]);
		border.animations = [scaleAnim];
		this.scene.beginAnimation(border, 0, 30, false);
		inner.animations = [scaleAnim.clone()];
		this.scene.beginAnimation(inner, 0, 30, false);
	}

	public resetBlackholeEffect(): void {
		if (!this.blackholeEffect) return;
		const inner = this.blackholeEffect.innerMesh;
		const border = this.blackholeEffect.borderMesh;
		const helix = this.blackholeEffect.helixMesh;

		const scaleAnim = new Animation("blackhole-scale-down", "scaling", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
		scaleAnim.setKeys([
			{ frame: 0, value: border.scaling.clone() },
			{ frame: 30, value: new Vector3(1, 1, 1) }
		]);
		border.animations = [scaleAnim];
		this.scene.beginAnimation(border, 0, 30, false);
		inner.animations = [scaleAnim.clone()];
		this.scene.beginAnimation(inner, 0, 30, false);

		if (inner.material && inner.material instanceof StandardMaterial) {
			const alphaAnim = new Animation("blackhole-inner-alpha-out", "alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
			alphaAnim.setKeys([
				{ frame: 0, value: inner.material.alpha },
				{ frame: 30, value: 0 }
			]);
			inner.material.animations = [alphaAnim];
			this.scene.beginAnimation(inner.material, 0, 30, false);
		}

		if (helix.material && helix.material instanceof StandardMaterial) {
			const alphaAnim = new Animation("blackhole-helix-alpha-out", "alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
			alphaAnim.setKeys([
				{ frame: 0, value: helix.material.alpha },
				{ frame: 30, value: 0 }
			]);
			helix.material.animations = [alphaAnim];
			this.scene.beginAnimation(helix.material, 0, 30, false);
		}

		if (border.material && border.material instanceof StandardMaterial) {
			const colorAnim = new Animation("blackhole-border-to-white", "diffuseColor", 30, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
			colorAnim.setKeys([
				{ frame: 0, value: (border.material as StandardMaterial).diffuseColor },
				{ frame: 30, value: Color3.FromHexString('#FFFFFF') }
			]);
			border.material.animations = [colorAnim];
			this.scene.beginAnimation(border.material, 0, 30, false);
		}
	}

	private updateBlackholeEffect(): void {
		const helix = this.blackholeEffect?.helixMesh;
		if (helix) {
			helix.rotation.y += 0.02;
		}
	}

	public update(): void {
		this.updateBlackholeEffect();
	}
}
