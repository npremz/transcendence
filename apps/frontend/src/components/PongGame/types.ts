import type { PublicState } from "../../net/wsClient";

export interface PongGameState extends PublicState {
	// si jamais
}

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	size: number;
	color: string;
}

export interface Ball {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
}

export interface TimeoutStatus {
	leftActive: boolean;
	leftRemainingMs: number;
	rightActive: boolean;
	rightRemainingMs: number;
}