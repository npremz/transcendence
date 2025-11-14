import { Paddle } from "../entities/Paddle";
import { Ball } from "../entities/Ball";
import { Scoreboard } from "../entities/Scoreboard";
import { CelebrationSphere } from "../entities/CelebrationSphere";
import type { Scene } from "@babylonjs/core";
import type { Game3DState, PowerUpsState } from "../types";
import { PowerUp } from "../entities/powerUp";

export class Renderer3D {
	private scene: Scene;
	
	// Entities
	private paddleLeft!: Paddle;
	private paddleRight!: Paddle;
	private balls: Map<string, Ball> = new Map();
	private scoreboard!: Scoreboard;
	private celebrationSphere!: CelebrationSphere;
	private currentState!: Game3DState;
	private powerUpMeshes: Map<string, PowerUp> = new Map(); //todo add !

	// Track last score to avoid unnecessary updates
	private lastScore = { left: 0, right: 0 };
	
	constructor(scene: Scene) {
		this.scene = scene;

		this.createInitialEntities();
	}

	private createInitialEntities(): void {
		this.paddleLeft = new Paddle(this.scene, 'left');
		this.paddleRight = new Paddle(this.scene, 'right');
		this.scoreboard = new Scoreboard(this.scene);
		this.celebrationSphere = new CelebrationSphere(this.scene);
	}


	public updateFromState(state: Game3DState): void {
		this.currentState = state;
		if (this.paddleLeft) {
			this.paddleLeft.updateFromState(state.paddleLeft, this.smashOffsetX?.('left'));
		}
		if (this.paddleRight) {
			this.paddleRight.updateFromState(state.paddleRight, this.smashOffsetX?.('right'));
		}
		this.updateBalls(state.balls);
		this.updatePowerUps(state.powerUpState);
		// Update scoreboard only if score changed
		if (this.scoreboard && state.score) {
			if (state.score.left !== this.lastScore.left || state.score.right !== this.lastScore.right) {
				// Detect who scored
				if (state.score.left > this.lastScore.left) {
					this.celebrationSphere.update();
				} else if (state.score.right > this.lastScore.right) {
					this.celebrationSphere.update();
				}
				
				this.scoreboard.updateScore(state.score.left, state.score.right);
				this.lastScore.left = state.score.left;
				this.lastScore.right = state.score.right;
			}
		}
	}

	private smashOffsetX = (side: 'left' | 'right'): number => {
		const skillType = side === 'left' ? this.currentState.selectedSkills.left : this.currentState.selectedSkills.right;
		if (skillType !== 'smash') 
		{
			return 0;
		}

		const skillState = side === 'left' ? this.currentState.skillStates.left : this.currentState.skillStates.right;
		const dur = 0.12;
		const dt = Math.max(0, this.currentState.clock - skillState.lastActivationAt);

		if (dt <= 0 || dt > dur) 
		{
			return 0;
		}
		const t = dt / dur;
		const amp = 0.5;
		const dir = side === 'left' ? 1 : -1;
		return dir * amp * Math.sin(Math.PI * t);
	};

	private updateBalls(ballStates: any[]): void {
		const currentBallIds = new Set(ballStates.map(b => b.id) || 'main');
		const existingBallIds = new Set(this.balls.keys());

		for (const id of existingBallIds) {
			if (!currentBallIds.has(id)) {
				const ball = this.balls.get(id);
				ball?.dispose();
				this.balls.delete(id);
			}
		}

		ballStates.forEach((ballState, index) => {
			const id = ballState.id || `main-${index}`;
			let ball = this.balls.get(id);
			if (!ball) {
				ball = new Ball(this.scene, id);
				this.balls.set(id, ball);
			}
			ball.updateFromState(ballState);
		});
	}

	private updatePowerUps(state: PowerUpsState): void {
		const currentPowerUpIds = new Set<string>();

		for (let i = 0; i < state.allPowerUps.length; i++) {
			const powerUp = state.allPowerUps[i];
			const id = `powerup-${powerUp.type}-${Math.round(powerUp.x * 100)}-${Math.round(powerUp.y * 100)}`;;
			currentPowerUpIds.add(id);

			let mesh = this.powerUpMeshes.get(id);

			if (!mesh) {
				mesh = new PowerUp(this.scene, id, powerUp);
				this.powerUpMeshes.set(id, mesh);
			}
			// Update the powerup's state, then call update to apply position
			mesh.updateState(powerUp);
			mesh.update();
		}

		for (const [id, mesh] of this.powerUpMeshes.entries()) {
			if (!currentPowerUpIds.has(id)) {
				mesh.dispose();
				this.powerUpMeshes.delete(id);
			}
		}
	}

	public render(): void {
		this.scene.render();
	}

	public dispose(): void {
		this.paddleLeft?.dispose();
		this.paddleRight?.dispose();
		this.scoreboard?.dispose();
		this.celebrationSphere?.dispose();
		this.balls.forEach(ball => ball.dispose());
		this.balls.clear();
		this.powerUpMeshes.forEach(p => p.dispose());
		this.powerUpMeshes.clear();
	}
}
