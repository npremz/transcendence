import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, ParticleSystem, Quaternion, Vector3, Color4, Animation} from "@babylonjs/core";

export class PowerUpEffects {
	private scene: Scene;

	constructor(scene: Scene) {
		this.scene = scene;
	}

	public activateBlackoutEffect(side: 'left' | 'right'): void {
		this.scene.meshes.forEach(mesh => {
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
		const inner = this.scene.getMeshByName('centerCircleInner') as Mesh;
		const border = this.scene.getMeshByName('centerCircle') as Mesh;
		const helix = this.scene.getMeshByName('blacholeHelix') as Mesh;

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
				{ frame: 30, value: 0.5 }
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

		const inner = this.scene.getMeshByName('centerCircleInner') as Mesh;
		const border = this.scene.getMeshByName('centerCircle') as Mesh;
		const helix = this.scene.getMeshByName('blacholeHelix') as Mesh;

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
		const helix = this.scene.getMeshByName('blacholeHelix') as Mesh | null;
		if (helix) helix.rotate(Vector3.Up(), 0.1);
	}

	public update(): void {
		this.updateBlackholeEffect();
	}
}
