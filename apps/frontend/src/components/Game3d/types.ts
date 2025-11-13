import type { Mesh, Vector3 } from '@babylonjs/core';

export interface Game3DState {
	paddleLeft: PaddleState;
	paddleRight: PaddleState;
	balls: BallState[];
	score: {
		left: number;
		right: number;
	};
}

export interface IEntity {
	id: string;
	mesh?: Mesh;
	position: Vector3;
	update(deltaTime: number): void;
	dispose(): void;
}

export interface IRenderable {
	render(): void;
	setVisibility(visible: boolean): void;
}

export interface PaddleState {
	y: number;
	z?: number;
	speed?: number;
	velocity?: number;
	intention?: number;
}

export interface BallState {
	id: string;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	speed: number;
}

export interface ISystem {
	initialize(): void;
	update(): void;
	dispose(): void;
}

export interface InputState {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
