import { Game3DEngine } from './core/game3DEngine';

interface Game3DConfig {
	wsURL?: string;
	roomId?: string;
}

export class Game3D {
	private canvas: HTMLCanvasElement;
	private gameEngine?: Game3DEngine;
	private config: Game3DConfig;

	constructor(element: HTMLElement) {
		console.log('[game3d] initializing...');

		//CANVAS
		const canvasElem = element.querySelector('#game3d-canvas') as HTMLCanvasElement;
		if (!canvasElem) throw new Error('[game3d] error: canvas not found');
		this.canvas = canvasElem;
		this.config = this.getConfiguration();
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

	private getConfiguration(): Game3DConfig {
		const storedUrl = sessionStorage.getItem('gameWsURL');
		let findRoomId = null;
		if (!storedUrl) {
			const host = import.meta.env.VITE_HOST;
			const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
			findRoomId = window.location.pathname.split('/').pop();
			const fallbackUrl = host && endpoint && findRoomId ? `wss://${host}${endpoint}/${findRoomId}` : undefined;
			return {
				wsURL: fallbackUrl || undefined,
				roomId: findRoomId || undefined
			};
		}
		return {
			wsURL: storedUrl ? storedUrl : undefined,
			roomId: findRoomId || undefined
		};
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
			this.gameEngine = null as any;
		}
		sessionStorage.removeItem('gameWsURL');
	}
}


export function Game3dComponent(): string {
	
	return `
		<div class="fixed inset-0 w-full h-full" data-component="game3d">
			<canvas id="game3d-canvas" class="w-full h-full block"></canvas>
			
			<!-- UI Overlay -->
			<div class="absolute top-0 left-0 right-0 flex justify-between items-center px-8 py-4 pointer-events-none">
				<div id="player-left-name" class="text-xl font-bold text-white drop-shadow-lg">Player 1</div>
				<button id="forfeit-btn" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto">
					Surrender
				</button>
				<div id="player-right-name" class="text-xl font-bold text-white drop-shadow-lg">Player 2</div>
			</div>
			
			<!-- Camera View Indicator -->
			<div class="absolute bottom-4 right-4 px-3 py-2 bg-black/50 text-white text-sm rounded pointer-events-none">
				Press <span class="font-bold text-cyan-400">V</span> to toggle camera view
			</div>
		</div>
	`;
}
