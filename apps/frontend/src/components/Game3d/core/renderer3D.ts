import { Paddle } from "../entities/Paddle";
import { Ball } from "../entities/Ball";
import type { Scene } from "@babylonjs/core";
import type { Game3DState } from "../types";

export class Renderer3D {
	private scene: Scene;
	
	// Entities
	private paddleLeft!: Paddle;
	private paddleRight!: Paddle;
	private balls: Map<string, Ball> = new Map();

	constructor(scene: Scene) {
		this.scene = scene;

		this.createInitialEntities();
	}

	private createInitialEntities(): void {

		this.paddleLeft = new Paddle(this.scene, 'left');
		this.paddleRight = new Paddle(this.scene, 'right');
	}


	public updateFromState(state: Game3DState): void {
		if (this.paddleLeft) {
			this.paddleLeft.updateFromState(state.paddleLeft);
		}
		if (this.paddleRight) {
			this.paddleRight.updateFromState(state.paddleRight);
		}

		this.updateBalls(state.balls);
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
		this.balls.forEach(ball => ball.dispose());
		this.balls.clear();
	}
}
