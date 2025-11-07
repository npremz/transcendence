import type { PublicState } from "../../net/wsClient";
import type { Scene, Mesh } from "@babylonjs/core";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../PongGame/constants";
const STADIUM_3D_WIDTH = 1920 / 100;
const STADIUM_3D_HEIGHT = 1080 / 100;

// Scale factors to convert 2D coords to 3D
const SCALE_X = STADIUM_3D_WIDTH / WORLD_WIDTH;
const SCALE_Z = STADIUM_3D_HEIGHT / WORLD_HEIGHT;

export interface Game3dMeshes {
	paddleOwner: Mesh | null;
	paddleOpponent: Mesh | null;
	ball: Mesh | null;
	ground: Mesh | null;
}

export class Game3dConnector {
	private meshes: Game3dMeshes;
	private side: 'left' | 'right' = 'left';
	
	// Interpolation for smooth movement
	private targetPositions: {
		paddleOwner: { x: number; z: number };
		paddleOpponent: { x: number; z: number };
		ball: { x: number; y: number; z: number };
	};

	constructor(_scene: Scene, meshes: Game3dMeshes) {
		this.meshes = meshes;
		
		this.targetPositions = {
			paddleOwner: { x: 0, z: 0 },
			paddleOpponent: { x: 0, z: 0 },
			ball: { x: 0, y: 0, z: 0 }
		};
	}

	setSide(side: 'left' | 'right') {
		this.side = side;
		console.log(`[Game3dConnector] Player assigned to side: ${side}`);
	}

	updateFromGameState(state: PublicState) {
		const leftMesh = this.side === 'left' ? this.meshes.paddleOpponent : this.meshes.paddleOwner;
		const rightMesh = this.side === 'left' ? this.meshes.paddleOwner : this.meshes.paddleOpponent;

		this.updatePaddlePosition(leftMesh, state.leftPaddle.y, 'left');
		this.updatePaddlePosition(rightMesh, state.rightPaddle.y, 'right');

		if (state.balls.length > 0) {
			const mainBall = state.balls[0];
			this.updateBallPosition(mainBall.x, mainBall.y);
		}

		// TODO: Handle powerups, blackhole effect, blackout effect, etc.
	}

	private convert2DYto3DZ(y2d: number): number {
		return (y2d - WORLD_HEIGHT / 2) * SCALE_Z;
	}

	private convert2DXto3DX(x2d: number): number {
		return (x2d - WORLD_WIDTH / 2) * SCALE_X;
	}

	private updatePaddlePosition(paddle: Mesh | null, y2d: number, side: 'left' | 'right') {
		if (!paddle) return;

		const z3d = y2d - STADIUM_3D_HEIGHT / 2;
		
		if (paddle === this.meshes.paddleOwner) {
			this.targetPositions.paddleOwner.z = z3d;
		} else {
			this.targetPositions.paddleOpponent.z = z3d;
		}

		paddle.position.z = z3d;
		
		// X position
		const paddleDistance = WORLD_WIDTH / 2 - 50; // 910
		paddle.position.x = side === 'left' ? -paddleDistance : paddleDistance;
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
		if (keys['w']) return -1;
		if (keys['s']) return 1;
		return 0;
	}

	interpolate(deltaTime: number) {
		const lerpFactor = Math.min(1, deltaTime * 10);

		if (this.meshes.paddleOwner) {
			this.meshes.paddleOwner.position.z += 
				(this.targetPositions.paddleOwner.z - this.meshes.paddleOwner.position.z) * lerpFactor;
		}

		if (this.meshes.paddleOpponent) {
			this.meshes.paddleOpponent.position.z += 
				(this.targetPositions.paddleOpponent.z - this.meshes.paddleOpponent.position.z) * lerpFactor;
		}

		if (this.meshes.ball) {
			this.meshes.ball.position.x += 
				(this.targetPositions.ball.x - this.meshes.ball.position.x) * lerpFactor;
			this.meshes.ball.position.z += 
				(this.targetPositions.ball.z - this.meshes.ball.position.z) * lerpFactor;
		}
	}

	// dispose() {
	// }
}
