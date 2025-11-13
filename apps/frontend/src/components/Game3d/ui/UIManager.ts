export class UIManager {
	private overlays: Set<HTMLElement> = new Set();

	constructor() {
		this.injectStyles();
	}

	/**
	 * Inject CSS animations
	 */
	private injectStyles(): void {
		if (document.getElementById('game3d-ui-styles')) return;

		const style = document.createElement('style');
		style.id = 'game3d-ui-styles';
		style.textContent = `
			@keyframes fadeIn {
				from {
					opacity: 0;
					transform: scale(0.9);
				}
				to {
					opacity: 1;
					transform: scale(1);
				}
			}

			.animate-fade-in {
				animation: fadeIn 0.3s ease-out;
			}

			@keyframes pulse {
				0%, 100% {
					opacity: 1;
				}
				50% {
					opacity: 0.5;
				}
			}

			.animate-pulse {
				animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
			}
		`;
		document.head.appendChild(style);
	}

	public updatePlayerNames(side: 'left' | 'right' | 'spectator', playerNames?: { left?: string; right?: string }): void {
		const leftNameEl = document.getElementById('player-left-name');
		const rightNameEl = document.getElementById('player-right-name');
		
		if (leftNameEl && playerNames?.left) {
			leftNameEl.textContent = side === 'left' 
				? `${playerNames.left} 👈 (You)` 
				: playerNames.left;
		}
		
		if (rightNameEl && playerNames?.right) {
			rightNameEl.textContent = side === 'right' 
				? `(You) 👉 ${playerNames.right}` 
				: playerNames.right;
		}
	}

	public showGameOver(winner: 'left' | 'right', mySide: 'left' | 'right' | 'spectator'): HTMLElement {
		const didIWin = mySide === winner;

		const overlay = document.createElement('div');
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-gradient-to-br from-[#0C154D] to-[#1a1f4d] border-2 ${didIWin ? 'border-green-400' : 'border-red-400'} rounded-2xl p-12 text-center max-w-lg shadow-2xl animate-fade-in">
				<div class="text-8xl mb-6 animate-pulse">
					${didIWin ? '🏆' : '💀'}
				</div>
				<h2 class="text-6xl font-bold mb-4 ${didIWin ? 'text-green-400' : 'text-red-400'}">
					${didIWin ? 'VICTORY!' : 'DEFEAT'}
				</h2>
				<p class="text-2xl mb-8 text-white/80">
					${winner === 'left' ? 'Left Player' : 'Right Player'} wins!
				</p>
				<button 
					id="game-over-return-btn"
					class="px-8 py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 rounded-xl text-white text-xl font-bold transition-all cursor-pointer hover:scale-105 shadow-lg"
				>
					Return to Lobby
				</button>
			</div>
		`;
		
		document.body.appendChild(overlay);
		this.overlays.add(overlay);

		return overlay;
	}

	public showDisconnect(): HTMLElement {
		const overlay = document.createElement('div');
		overlay.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-500 rounded-2xl p-12 text-center max-w-lg shadow-2xl animate-fade-in">
				<div class="text-8xl mb-6 animate-pulse">
					⚠️
				</div>
				<h2 class="text-5xl font-bold mb-4 text-white">Connection Lost</h2>
				<p class="text-xl mb-8 text-white/80">Disconnected from server</p>
				<button 
					id="disconnect-return-btn"
					class="px-8 py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 rounded-xl text-white text-xl font-bold transition-all cursor-pointer hover:scale-105 shadow-lg"
				>
					Return to Home
				</button>
			</div>
		`;
		
		document.body.appendChild(overlay);
		this.overlays.add(overlay);

		return overlay;
	}

	public showWaiting(): HTMLElement {
		const overlay = document.createElement('div');
		overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40';
		overlay.innerHTML = `
			<div class="bg-gradient-to-br from-[#0C154D] to-[#1a1f4d] border-2 border-cyan-400 rounded-2xl p-12 text-center max-w-lg shadow-2xl animate-fade-in">
				<div class="text-6xl mb-6 animate-pulse">
					⏳
				</div>
				<h2 class="text-4xl font-bold mb-4 text-cyan-400">Waiting for Players</h2>
				<p class="text-xl text-white/80">Connecting to game server...</p>
				<div class="mt-8 flex justify-center gap-2">
					<div class="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style="animation-delay: 0s"></div>
					<div class="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
					<div class="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
				</div>
			</div>
		`;
		
		document.body.appendChild(overlay);
		this.overlays.add(overlay);

		return overlay;
	}

	public showCountdown(count: number): void {
		const existing = document.getElementById('countdown-overlay');
		if (existing) {
			existing.remove();
		}

		const overlay = document.createElement('div');
		overlay.id = 'countdown-overlay';
		overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
		
		const text = count > 0 ? count.toString() : 'GO!';
		const color = count > 0 ? 'text-yellow-400' : 'text-green-400';
		
		overlay.innerHTML = `
			<div class="text-[200px] font-bold ${color} animate-fade-in drop-shadow-2xl">
				${text}
			</div>
		`;
		
		document.body.appendChild(overlay);

		// Auto-remove after animation
		setTimeout(() => {
			overlay.remove();
		}, 1000);
	}

	public removeOverlay(overlay: HTMLElement): void {
		if (overlay.parentElement) {
			overlay.parentElement.removeChild(overlay);
		}
		this.overlays.delete(overlay);
	}

	public clearAllOverlays(): void {
		this.overlays.forEach(overlay => {
			if (overlay.parentElement) {
				overlay.parentElement.removeChild(overlay);
			}
		});
		this.overlays.clear();
	}

	public dispose(): void {
		this.clearAllOverlays();
	}
}
