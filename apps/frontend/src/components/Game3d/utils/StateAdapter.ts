import type { PublicState } from '../../../net/wsClient';
import type { Game3DState, BallState, PaddleState, GameStatusInfo } from '../types';

export class StateAdapter {
	public static toGame3DState(serverState: PublicState): Game3DState {
		return {
			paddleLeft: this.convertPaddle(serverState.leftPaddle),
			paddleRight: this.convertPaddle(serverState.rightPaddle),
			balls: this.convertBalls(serverState.balls),
			score: serverState.score,
			selectedSkills: serverState.selectedSkills,
			skillStates: serverState.skillStates,
			clock: serverState.clock,
			powerUpState: this.convertPowerUps(serverState)
		};
	}

	private static convertPaddle(paddle: { y: number; speed: number; intention: number }): PaddleState {
		return {
			y: paddle.y,
			speed: paddle.speed,
			intention: paddle.intention
		};
	}

	private static convertBalls(balls: { x: number; y: number; vx: number; vy: number; radius: number }[]): BallState[] {
		return balls.map((ball, index) => ({
			id: `ball-${index}`,
			x: ball.x,
			y: ball.y,
			z: 0,
			vx: ball.vx,
			vy: ball.vy,
			vz: 0,
			speed: Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy),
		}));
	}

	private static convertPowerUps(serverState: PublicState) {
		return {
			allPowerUps: serverState.powerUps,
			splitActive: serverState.splitActive,
			clock: serverState.clock,
			blackoutLeft: serverState.blackoutLeft,
			blackoutRight: serverState.blackoutRight,
			blackoutLeftIntensity: serverState.blackoutLeftIntensity,
			blackoutRightIntensity: serverState.blackoutRightIntensity,
			blackholeActive: serverState.blackholeActive,
			blackholeProgress: serverState.blackholeProgress,
			blackholeCenterX: serverState.blackholeCenterX,
			blackholeCenterY: serverState.blackholeCenterY
		}
	}

	public static getStatusInfo(serverState: PublicState): GameStatusInfo {
		return {
			isPaused: serverState.isPaused,
			isGameOver: serverState.isGameOver,
			winner: serverState.winner,
			countdownValue: serverState.countdownValue,
			score: serverState.score
		}
	}

	public static getExtendedInfo(serverState: PublicState) {
		return {
			isPaused: serverState.isPaused,
			isGameOver: serverState.isGameOver,
			winner: serverState.winner,
			countdownValue: serverState.countdownValue,
			powerUps: serverState.powerUps,
			splitActive: serverState.splitActive,
			blackoutLeft: serverState.blackoutLeft,
			blackoutRight: serverState.blackoutRight,
			blackoutLeftIntensity: serverState.blackoutLeftIntensity,
			blackoutRightIntensity: serverState.blackoutRightIntensity,
			blackholeActive: serverState.blackholeActive,
			blackholeProgress: serverState.blackholeProgress,
			blackholeCenterX: serverState.blackholeCenterX,
			blackholeCenterY: serverState.blackholeCenterY,
			selectedSkills: serverState.selectedSkills,
			skillStates: serverState.skillStates,
			clock: serverState.clock
		};
	}
}
