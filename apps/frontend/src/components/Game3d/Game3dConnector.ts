import type { PublicState } from "../../net/wsClient";
import type { Scene, Mesh, AbstractMesh } from "@babylonjs/core";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../PongGame/constants";
const STADIUM_3D_WIDTH = 1920 / 100;
const STADIUM_3D_HEIGHT = 1080 / 100;

// Scale factors to convert 2D coords to 3D
const SCALE_X = STADIUM_3D_WIDTH / WORLD_WIDTH;
const SCALE_Z = STADIUM_3D_HEIGHT / WORLD_HEIGHT;

export interface Game3dMeshes {
	paddleLeft: AbstractMesh | null;
	paddleRight: AbstractMesh | null;
	ball: Mesh | null;
	ground: AbstractMesh | null;
}

export class Game3dConnector {
	private meshes: Game3dMeshes;
	private playerSide: 'left' | 'right' = 'left';
	
	// Interpolation for smooth movement
	private targetPositions: {
		paddleLeft: { x: number; z: number };
		paddleRight: { x: number; z: number };
		ball: { x: number; y: number; z: number };
	};

	constructor(_scene: Scene, meshes: Game3dMeshes) {
		this.meshes = meshes;
		
		this.targetPositions = {
			paddleLeft: { x: 0, z: 0 },
			paddleRight: { x: 0, z: 0 },
			ball: { x: 0, y: 0, z: 0 }
		};
	}

	setSide(side: 'left' | 'right') {
		this.playerSide = side;
	}

	updateFromGameState(state: PublicState) {
		this.updatePaddlePosition(this.meshes.paddleRight, state.leftPaddle.y, 'right');
		this.updatePaddlePosition(this.meshes.paddleLeft, state.rightPaddle.y, 'left');

		if (state.balls.length > 0) {
			const mainBall = state.balls[0];
			this.updateBallPosition(mainBall.x, mainBall.y);
		}

		// TODO: powerups
	}

	private convert2DYto3DZ(y2d: number): number {
		return (y2d - WORLD_HEIGHT / 2) * SCALE_Z;
	}

	private convert2DXto3DX(x2d: number): number {
		return (x2d - WORLD_WIDTH / 2) * SCALE_X;
	}

	private updatePaddlePosition(paddle: AbstractMesh | null, y2d: number, side: 'left' | 'right') {
		if (!paddle) return;

		const z3d = y2d - 540; //!!!!!!!!!!!!!!!!!!!!!!!
		if (side === 'left') {
			this.targetPositions.paddleLeft.z = z3d;
		} else {
			this.targetPositions.paddleRight.z = z3d;
		}

		paddle.position.z = z3d;
		
		const paddleDistance = WORLD_WIDTH / 2 - 50; // 910
		const x3d = side === 'left' ? - paddleDistance : paddleDistance;
		paddle.position.x = x3d;
		
		paddle.position.y = 0;
	}

	private updateBallPosition(x2d: number, y2d: number) {
		if (!this.meshes.ball) return;
		
		const x3d = this.convert2DXto3DX(x2d);
		const z3d = this.convert2DYto3DZ(y2d);

		this.targetPositions.ball.x = x3d;
		this.targetPositions.ball.z = z3d;
		this.targetPositions.ball.y = 0;

		// visual pos
		this.meshes.ball.position.x = x3d;
		this.meshes.ball.position.z = z3d;
		this.meshes.ball.position.y = 0;
	}

	getPaddleIntention(keys: { [key: string]: boolean }): number {
		if (keys['w']) return 1;   // Move up
		if (keys['s']) return -1;  // Move down
		return 0;
	}

	interpolate(deltaTime: number) {
		const lerpFactor = Math.min(1, deltaTime * 10);

		if (this.meshes.paddleLeft) {
			this.meshes.paddleLeft.position.z += 
				(this.targetPositions.paddleLeft.z - this.meshes.paddleLeft.position.z) * lerpFactor;
		}

		if (this.meshes.paddleRight) {
			this.meshes.paddleRight.position.z += 
				(this.targetPositions.paddleRight.z - this.meshes.paddleRight.position.z) * lerpFactor;
		}

		if (this.meshes.ball) {
			this.meshes.ball.position.x += 
				(this.targetPositions.ball.x - this.meshes.ball.position.x) * lerpFactor;
			this.meshes.ball.position.z += 
				(this.targetPositions.ball.z - this.meshes.ball.position.z) * lerpFactor;
		}
	}

	dispose() {
		// Clean up if needed
	}

	// Debug method to visualize current state
	getDebugInfo() {
		return {
			playerSide: this.playerSide,
			leftPaddlePos: this.meshes.paddleLeft?.position,
			rightPaddlePos: this.meshes.paddleRight?.position,
			ballPos: this.meshes.ball?.position
		};
	}
}
