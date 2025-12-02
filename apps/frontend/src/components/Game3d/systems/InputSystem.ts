import type { ISystem, InputState } from '../types';
import { KEY } from '../constants';

export class InputSystem implements ISystem {
	private keys: Map<string, boolean> = new Map();
	private canvas: HTMLCanvasElement;
	private vKeyWasPressed: boolean = false;
	private pauseKeyWasPressed: boolean = false;

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
		const isVPressed = this.isKeyPressed(KEY.CAMERA);
		
		if (isVPressed && !this.vKeyWasPressed) {
			this.vKeyWasPressed = true;
			return true;
		}
		
		if (!isVPressed) {
			this.vKeyWasPressed = false;
		}
		
		return false;
	}

	public isPauseKeyPressed(): boolean {
		const isPausePressed = KEY.PAUSE.some(key => this.isKeyPressed(key));
		if (isPausePressed && !this.pauseKeyWasPressed) {
			this.pauseKeyWasPressed = true;
			return true;
		}
		if (!isPausePressed) {
			this.pauseKeyWasPressed = false;
		}
		return false;
	}

	public update(): void {
	}

	public dispose(): void {
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		this.keys.clear();
		this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
	}
}
