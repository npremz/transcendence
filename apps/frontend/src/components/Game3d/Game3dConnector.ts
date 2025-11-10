import type { PublicState } from "../../net/wsClient";
import type { Scene, Mesh, AbstractMesh, ShadowGenerator } from "@babylonjs/core";
import { MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
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
	private scene: Scene;
	private shadowGenerator: ShadowGenerator;
	
	// Track additional balls for split powerup
	private additionalBalls: Mesh[] = [];
	
	// Track powerup meshes
	private powerUpMeshes: Map<string, Mesh> = new Map();
	
	// Interpolation for smooth movement
	private targetPositions: {
		paddleLeft: { x: number; z: number };
		paddleRight: { x: number; z: number };
		ball: { x: number; y: number; z: number };
	};

	constructor(scene: Scene, meshes: Game3dMeshes, shadowGenerator: ShadowGenerator) {
		this.scene = scene;
		this.meshes = meshes;
		this.shadowGenerator = shadowGenerator;
		
		this.targetPositions = {
			paddleLeft: { x: 0, z: 0 },
			paddleRight: { x: 0, z: 0 },
			ball: { x: 0, y: 0, z: 0 }
		};
	}

	setSide(side: 'left' | 'right') {
		this.playerSide = side;
	}

	updateFromGameState(state: PublicState, smashOffsetX?: (side: 'left' | 'right') => number) {
		this.updatePaddlePosition(this.meshes.paddleRight, state.leftPaddle.y, 'right', smashOffsetX);
		this.updatePaddlePosition(this.meshes.paddleLeft, state.rightPaddle.y, 'left', smashOffsetX);

		// Handle multiple balls (split powerup)
		this.updateAllBalls(state.balls);

		// handle powerups
		this.updatePowerUps(state.powerUps);
	}

	/**
	 * Update powerup meshes - create/destroy/position based on server state
	 */
	private updatePowerUps(powerUps: Array<{x: number; y: number; radius: number; type: string}>) {
		// Create a set of current powerup IDs from server
		const currentPowerUpIds = new Set<string>();
		
		// Update or create powerup meshes
		for (let i = 0; i < powerUps.length; i++) {
			const powerUp = powerUps[i];
			const id = `powerup-${i}-${powerUp.type}`;
			currentPowerUpIds.add(id);
			
			let mesh = this.powerUpMeshes.get(id);
			
			// Create new mesh if it doesn't exist
			if (!mesh) {
				mesh = this.createPowerUpMesh(powerUp.type, powerUp.radius);
				this.powerUpMeshes.set(id, mesh);
			}
			
			// Update position
			mesh.position.x = this.convert2DXto3DX(powerUp.x);
			mesh.position.z = this.convert2DYto3DZ(powerUp.y);
			mesh.position.y = 1; // Slightly above ground for visibility
			
			// Add floating animation
			mesh.position.y += Math.sin(Date.now() * 0.003 + i) * 0.2;
		}
		
		// Remove powerups that no longer exist
		for (const [id, mesh] of this.powerUpMeshes.entries()) {
			if (!currentPowerUpIds.has(id)) {
				if (mesh.material) {
					mesh.material.dispose();
				}
				mesh.dispose();
				this.powerUpMeshes.delete(id);
			}
		}
	}
	
	/**
	 * Create a powerup mesh based on type
	 */
	private createPowerUpMesh(type: string, radius: number): Mesh {
		const diameter = radius * 2 * SCALE_X; // Scale to match 3D world
		const mesh = MeshBuilder.CreateSphere(`powerup-${type}`, { diameter }, this.scene);
		const material = new StandardMaterial(`powerup-${type}-mat`, this.scene);
		
		// Set color based on type
		switch (type) {
			case 'split':
				material.diffuseColor = Color3.FromHexString('#FFD700'); // Gold
				material.emissiveColor = Color3.FromHexString('#FFD700').scale(0.3);
				break;
			case 'blackout':
				material.diffuseColor = Color3.FromHexString('#9B59B6'); // Purple
				material.emissiveColor = Color3.FromHexString('#9B59B6').scale(0.3);
				break;
			case 'blackhole':
				material.diffuseColor = Color3.FromHexString('#20054b'); // Dark blue
				material.emissiveColor = Color3.FromHexString('#0ea5e9').scale(0.5);
				break;
			default:
				material.diffuseColor = Color3.Red();
		}
		
		mesh.material = material;
		
		// Enable shadow casting
		this.shadowGenerator.addShadowCaster(mesh);
		
		return mesh;
	}

	private updateAllBalls(balls: Array<{x: number; y: number; vx: number; vy: number; radius: number}>) {
		if (balls.length === 0) return;

		// Update main ball (always exists)
		if (this.meshes.ball) {
			this.updateBallPosition(this.meshes.ball, balls[0].x, balls[0].y);
		}

		// Handle additional balls for split powerup
		const additionalBallCount = balls.length - 1;

		// Create additional balls if needed
		while (this.additionalBalls.length < additionalBallCount) {
			const newBall = this.createBall();
			this.additionalBalls.push(newBall);
		}

	// Remove extra balls if split ended
	while (this.additionalBalls.length > additionalBallCount) {
		const ball = this.additionalBalls.pop();
		if (ball) {
			if (ball.material) {
				ball.material.dispose();
			}
			ball.dispose();
		}
	}		// Update positions of additional balls
		for (let i = 0; i < this.additionalBalls.length; i++) {
			const ballData = balls[i + 1]; // Skip first ball (main ball)
			this.updateBallPosition(this.additionalBalls[i], ballData.x, ballData.y);
		}
	}

	private createBall(): Mesh {
		const ball = MeshBuilder.CreateSphere('ball-extra', { diameter: 0.3 }, this.scene);
		const material = new StandardMaterial('ballMat-extra', this.scene);
		material.diffuseColor = Color3.FromHexString('#FFFFFF');
		ball.material = material;
		ball.position.y = 0;
		
		return ball;
	}

	private convert2DYto3DZ(y2d: number): number {
		return (y2d - WORLD_HEIGHT / 2) * SCALE_Z;
	}

	private convert2DXto3DX(x2d: number): number {
		return (x2d - WORLD_WIDTH / 2) * SCALE_X;
	}

	private updatePaddlePosition(paddle: AbstractMesh | null, y2d: number, side: 'left' | 'right', smashOffsetX?: (side: 'left' | 'right') => number) {
		if (!paddle) return;

		const z3d = y2d - 540; //!!!!!!!!!!!!!!!!!!!!!!!
		if (side === 'left') {
			this.targetPositions.paddleLeft.z = z3d;
		} else {
			this.targetPositions.paddleRight.z = z3d;
		}
		paddle.position.z = z3d;
		
		// Calculate base position
		const paddleDistance = WORLD_WIDTH / 2 - 50; // 910
		const baseX3d = side === 'left' ? -paddleDistance : paddleDistance;
		
		// Apply smash offset (convert 2D pixels to 3D units)
		const smashOffset2D = smashOffsetX ? smashOffsetX(side) : 0;
		const smashOffset3D = smashOffset2D; // baseX is already in the same unit space, no extra scaling
		
		// Debug logging
		if (smashOffset2D !== 0) {
			console.log(`[CONNECTOR] ${side} paddle: smash=${smashOffset2D.toFixed(2)} (units), baseX=${baseX3d.toFixed(2)}, finalX=${(baseX3d + smashOffset3D).toFixed(2)}`);
		}
		
		// Final position with smash animation
		paddle.position.x = baseX3d + smashOffset3D;
		paddle.position.y = 0;
	}

	private updateBallPosition(ball: Mesh, x2d: number, y2d: number) {
		if (!ball) return;
		
		const x3d = this.convert2DXto3DX(x2d);
		const z3d = this.convert2DYto3DZ(y2d);

		// visual pos
		ball.position.x = x3d;
		ball.position.z = z3d;
		ball.position.y = 0;
	}

	getPaddleIntention(keys: { [key: string]: boolean }, side: 'left' | 'right'): number {
		if (side === 'left') {
			if (keys['w'] || keys['a']) return 1;
			if (keys['s'] || keys['d']) return -1;
		} else {
			if (keys['w'] || keys['d']) return 1;
			if (keys['s'] || keys['a']) return -1;
		}
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
		// Dispose additional balls created for split powerup
		for (const ball of this.additionalBalls) {
			if (ball.material) {
				ball.material.dispose();
			}
			ball.dispose();
		}
		this.additionalBalls = [];
		
		// Dispose all powerup meshes
		for (const [_, mesh] of this.powerUpMeshes.entries()) {
			if (mesh.material) {
				mesh.material.dispose();
			}
			mesh.dispose();
		}
		this.powerUpMeshes.clear();
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
