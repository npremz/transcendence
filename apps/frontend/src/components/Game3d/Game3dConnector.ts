/**
 * Game3dConnector
 * 
 * This class acts as a bridge between the 3D Babylon.js scene and the game logic.
 * It receives game state updates from the WebSocket server and translates them
 * into 3D scene updates.
 * 
 * Architecture:
 * - Receives PublicState from WSClient (same as 2D Pong)
 * - Translates 2D coordinates to 3D positions
 * - Updates Babylon.js meshes based on game state
 * - Handles input and sends it to the game server
 */

import type { PublicState } from "../../net/wsClient";
import type { Scene, Mesh } from "@babylonjs/core";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../PongGame/constants";

// 3D Stadium dimensions (match your stadium.gltf model)
const STADIUM_3D_WIDTH = 1920;  // X axis
const STADIUM_3D_HEIGHT = 1080; // Z axis (depth)

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

	/**
	 * Set which side the player is controlling
	 */
	setSide(side: 'left' | 'right') {
		this.side = side;
	}

	/**
	 * Update the 3D scene based on game state from server
	 * This is called every time we receive a state update from WSClient
	 */
	updateFromGameState(state: PublicState) {
		// Determine which paddle the player controls
		const ownPaddle = this.side === 'left' ? state.leftPaddle : state.rightPaddle;
		const opponentPaddle = this.side === 'left' ? state.rightPaddle : state.leftPaddle;

		// Update paddle positions
		this.updatePaddlePosition(this.meshes.paddleOwner, ownPaddle.y, this.side);
		this.updatePaddlePosition(this.meshes.paddleOpponent, opponentPaddle.y, this.side === 'left' ? 'right' : 'left');

		// Update ball position (use first ball, or handle multiple balls for split powerup)
		if (state.balls.length > 0) {
			const mainBall = state.balls[0];
			this.updateBallPosition(mainBall.x, mainBall.y);
		}

		// TODO: Handle powerups, blackhole effect, blackout effect, etc.
		// This can be expanded later to add visual effects
	}

	/**
	 * Convert 2D Pong Y coordinate to 3D Z coordinate
	 */
	private convert2DYto3DZ(y2d: number): number {
		// Map from [0, WORLD_HEIGHT] to [-STADIUM_3D_HEIGHT/2, STADIUM_3D_HEIGHT/2]
		return (y2d - WORLD_HEIGHT / 2) * (STADIUM_3D_HEIGHT / WORLD_HEIGHT);
	}

	/**
	 * Convert 2D Pong X coordinate to 3D X coordinate
	 */
	private convert2DXto3DX(x2d: number): number {
		// Map from [0, WORLD_WIDTH] to [-STADIUM_3D_WIDTH/2, STADIUM_3D_WIDTH/2]
		return (x2d - WORLD_WIDTH / 2) * (STADIUM_3D_WIDTH / WORLD_WIDTH);
	}

	/**
	 * Update paddle position in 3D space
	 */
	private updatePaddlePosition(paddle: Mesh | null, y2d: number, side: 'left' | 'right') {
		if (!paddle) return;

		const z3d = this.convert2DYto3DZ(y2d);
		
		// Set target position for smooth interpolation
		if (paddle === this.meshes.paddleOwner) {
			this.targetPositions.paddleOwner.z = z3d;
		} else {
			this.targetPositions.paddleOpponent.z = z3d;
		}

		// Direct update (can be interpolated in render loop for smoothness)
		paddle.position.z = z3d;
		
		// X position depends on which side
		// Left paddle is at negative X, right paddle at positive X
		const paddleDistance = STADIUM_3D_WIDTH / 2 - 50; // Distance from center
		paddle.position.x = side === 'left' ? -paddleDistance : paddleDistance;
	}

	/**
	 * Update ball position in 3D space
	 */
	private updateBallPosition(x2d: number, y2d: number) {
		if (!this.meshes.ball) return;

		const x3d = this.convert2DXto3DX(x2d);
		const z3d = this.convert2DYto3DZ(y2d);

		// Ball stays at Y=0 height (on the ground level)
		this.targetPositions.ball.x = x3d;
		this.targetPositions.ball.z = z3d;
		this.targetPositions.ball.y = 0;

		// Direct update
		this.meshes.ball.position.x = x3d;
		this.meshes.ball.position.z = z3d;
		this.meshes.ball.position.y = 0; // Ball rolls on the ground
	}

	/**
	 * Get paddle movement intention based on keyboard input
	 * Returns -1 (up), 0 (no movement), or 1 (down)
	 */
	getPaddleIntention(keys: { [key: string]: boolean }): number {
		if (keys['w'] || keys['arrowup']) return -1;
		if (keys['s'] || keys['arrowdown']) return 1;
		return 0;
	}

	/**
	 * Smooth interpolation for render loop
	 * Call this every frame to smooth out movements between state updates
	 */
	interpolate(deltaTime: number) {
		const lerpFactor = Math.min(1, deltaTime * 10); // Adjust smoothness

		// Interpolate paddle owner
		if (this.meshes.paddleOwner) {
			this.meshes.paddleOwner.position.z += 
				(this.targetPositions.paddleOwner.z - this.meshes.paddleOwner.position.z) * lerpFactor;
		}

		// Interpolate paddle opponent
		if (this.meshes.paddleOpponent) {
			this.meshes.paddleOpponent.position.z += 
				(this.targetPositions.paddleOpponent.z - this.meshes.paddleOpponent.position.z) * lerpFactor;
		}

		// Interpolate ball
		if (this.meshes.ball) {
			this.meshes.ball.position.x += 
				(this.targetPositions.ball.x - this.meshes.ball.position.x) * lerpFactor;
			this.meshes.ball.position.z += 
				(this.targetPositions.ball.z - this.meshes.ball.position.z) * lerpFactor;
		}
	}

	/**
	 * Dispose of resources
	 */
	dispose() {
		// Clean up any resources if needed
	}
}
