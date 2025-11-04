import type { WSClient } from "../../net/wsClient";

export class PongInputHandler {
	private keys = {w: false, s: false, up: false, down: false};
	private net: WSClient;
	private secondaryNet?: WSClient;
	private leftController: WSClient;
	private rightController?: WSClient;

	constructor(net: WSClient, secondaryNet?: WSClient) {
		this.net = net;
		this.secondaryNet = secondaryNet;
		this.leftController = net;
		this.rightController = secondaryNet;
	}

	private onKeyDown = (e: KeyboardEvent): void => {
		switch (e.key) {
			case 'w':
			case 'W':
				this.keys.w = true;
				break;
			case 's':
			case 'S':
				this.keys.s = true;
				break;
			case 'ArrowUp':
				this.keys.up = true;
				e.preventDefault();
				break;
			case 'ArrowDown':
				this.keys.down = true;
				e.preventDefault();
				break;
			case ' ':
				this.leftController.useSkill();
				e.preventDefault();
				return;
			case 'Enter':
				(this.rightController ?? this.leftController).useSkill();
				e.preventDefault();
				return;
			case 'p':
			case 'P':
			case 'Escape':
				this.handlePause();
				e.preventDefault();
				return;
		}
		this.sendIntent();
	};

	private onKeyUp = (e: KeyboardEvent): void => {
		switch (e.key) {
			case 'w':
			case 'W':
				this.keys.w = false;
				break;
			case 's':
			case 'S':
				this.keys.s = false;
				break;
			case 'ArrowUp':
				this.keys.up = false;
				break;
			case 'ArrowDown':
				this.keys.down = false;
				break;
		}
		this.sendIntent();
	};

	private sendIntent(): void {
		if (this.rightController && this.rightController !== this.leftController) {
			this.leftController.sendInput(!!this.keys.w, !!this.keys.s);
			this.rightController.sendInput(!!this.keys.up, !!this.keys.down);
		} else {
			const up = this.keys.w || this.keys.up;
			const down = this.keys.s || this.keys.down;
			this.net.sendInput(!!up, !!down);
		}
	}

	private handlePause(): void {
		window.dispatchEvent(new CustomEvent('pong:togglePause'));
	}

	attach(): void {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	detach(): void {
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
	}

	setControllers(left: WSClient, right?: WSClient): void {
		this.leftController = left;
		this.rightController = right;
	}

	getKeys() {
		return ({ ...this.keys});
	}
}
