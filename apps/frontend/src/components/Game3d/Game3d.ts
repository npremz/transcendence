import { Game3DEngine } from './core/game3DEngine';

export class Game3D {
	private canvas: HTMLCanvasElement;
	private gameEngine?: Game3DEngine;

	constructor(element: HTMLElement) {
		console.log('[game3d] initializing...');
		const canvasElem = element.querySelector('#game3d-canvas') as HTMLCanvasElement;
		if (!canvasElem) throw new Error('[game3d] error: canvas not found');
		this.canvas = canvasElem;
		this.initalizeEngine();
	}

	private initalizeEngine(): void {
		try {
			this.gameEngine = new Game3DEngine(this.canvas);
			this.gameEngine.start();
		} catch (error) {
			this.showError('Failed to initialize 3D game. Please refresh the page.');
		}

	}
	
	//todo verify if its ok to use the innerHtml
	private showError(message: string): void {
		const overlay = document.createElement('div');
		overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-red-900/50 border-2 border-red-500 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-2xl font-bold text-red-400 mb-4">Error</h2>
				<p class="text-white mb-6">${message}</p>
				<button 
					onclick="window.location.reload()" 
					class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold"
				>
					Reload Page
				</button>
			</div>
		`;
		document.body.appendChild(overlay);
	}

	public cleanup(): void {
		console.log('[game3d] disposing...');
		if (this.gameEngine) {
			this.gameEngine.dispose();
			this.gameEngine = undefined;
		}
		sessionStorage.removeItem('gameWsURL');
		sessionStorage.removeItem('currentGameRoute');
		sessionStorage.removeItem('viewMode');
	}
}
