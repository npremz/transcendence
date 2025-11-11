import { Engine } from '@babylonjs/core';

export class Game3DEngine {
	private engine: Engine;

	constructor(canvas: HTMLCanvasElement) {
		this.engine = new Engine(canvas, true);
	}
}
