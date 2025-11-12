import type { ISystem, InputState } from '../types';

export class InputSystem implements ISystem {
	private keys: Map<string, boolean> = new Map();
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	public initialize(): void {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		
		this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
	}
	
	private onKeyDown = (event: KeyboardEvent): void => {
		this.keys.set(event.key.toLowerCase(), true);
	}

	private onKeyUp = (event: KeyboardEvent): void => {
		this.keys.set(event.key.toLowerCase(), false);
	}

	public isKeyPressed(key: string): boolean {
		return this.keys.get(key.toLowerCase()) || false;
	}

	public getInput(): InputState {
		return {
			up: this.isKeyPressed('w'),
			down: this.isKeyPressed('s'),
			left: this.isKeyPressed('a'),
			right: this.isKeyPressed('d'),
		};
	}

	public isSkillKeyPressed(): boolean {
		return this.isKeyPressed(' ');
	}

	public isCameraToggleKeyPressed(): boolean {
		return this.isKeyPressed('v');
	}

	public update(): void {
		// No continuous update needed for input system
	}

	public dispose(): void {
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		this.keys.clear();
	}
}
