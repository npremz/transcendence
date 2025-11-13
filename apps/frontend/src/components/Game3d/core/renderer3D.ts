import { Paddle } from "../entities/Paddle";
import { Ball } from "../entities/Ball";
import { Scoreboard } from "../entities/Scoreboard";
import { CelebrationSphere } from "../entities/CelebrationSphere";
import type { Scene } from "@babylonjs/core";
import type { Game3DState } from "../types";

export class Renderer3D {
	private scene: Scene;
	
	// Entities
	private paddleLeft!: Paddle;
	private paddleRight!: Paddle;
	private balls: Map<string, Ball> = new Map();
	private scoreboard!: Scoreboard;
	private celebrationSphere!: CelebrationSphere;
	
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
		if (this.paddleLeft) {
			this.paddleLeft.updateFromState(state.paddleLeft);
		}
		if (this.paddleRight) {
			this.paddleRight.updateFromState(state.paddleRight);
		}

		this.updateBalls(state.balls);

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
	}
}
