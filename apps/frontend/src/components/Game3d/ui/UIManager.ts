import type { GameStatusInfo, TimeoutStatus, Game3DState} from "../types";

export class UIManager {
	private previousCount: number = 0;

	constructor() {
	}

	public updatePlayerNames(side: 'left' | 'right' | 'spectator', playerNames?: { left?: string; right?: string }): void {
		const leftNameEl = document.getElementById('player-left-name');
		const rightNameEl = document.getElementById('player-right-name');
		
		if (leftNameEl && playerNames?.left) {
			leftNameEl.textContent = playerNames.left;
			if (side === 'left') {
				leftNameEl.classList.add('emphasize-side-player');
			} else {
				leftNameEl.classList.remove('emphasize-side-player');
			}
		}
		
		if (rightNameEl && playerNames?.right) {
			rightNameEl.textContent = playerNames.right;
			if (side === 'right') {
				rightNameEl.classList.add('emphasize-side-player');
			} else {
				rightNameEl.classList.remove('emphasize-side-player');
			}
		}
	}

	public showGameOver(didIWin: boolean, score: { left: number; right: number }): HTMLElement {
		const overlay = document.createElement('div');
		overlay.id = 'game-over-overlay';
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-[#0C154D]/90 border-2 border-white/20 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-4xl font-bold mb-4 ${didIWin ? 'text-green-400' : 'text-red-400'}">
					${didIWin ? '🏆 WIN !' : '💀 DEFEAT'}
				</h2>
				<p class="text-white/80 text-xl mb-6">
					Score: ${score.left} - ${score.right}
				</p>
				<button 
					id="return-to-lobby"
					class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all cursor-pointer"
				>
					Return to Lobby
				</button>
			</div>
		`;
		return overlay;
	}

	public handleTournamentGameOver(didIWin: boolean, score: { left: number; right: number }): HTMLElement {
		const overlay = document.createElement('div');
		overlay.id = 'tournament-game-over-overlay';
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-[#0C154D]/90 border-2 border-white/20 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-4xl font-bold mb-4 ${didIWin ? 'text-green-400' : 'text-red-400'}">
					${didIWin ? '🏆 TOURNAMENT WIN!' : '💀 TOURNAMENT DEFEAT!'}
				</h2>
				<p class="text-white/80 text-xl mb-6">
					Score: ${score.left} - ${score.right}
				</p>
				<button 
					id="return-to-lobby"
					class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all cursor-pointer"
				>
					Return to Lobby
				</button>
			</div>
		`;
		return overlay;
	}

	private updateSkillOverlay(side: 'left' | 'right' | 'spectator', state: Game3DState | null): void {
		if (!state) return;
		const isBlackout = side === 'left' ? state.powerUpState.blackoutLeft : state.powerUpState.blackoutRight;
		if (isBlackout) return;
		const skillState = side === 'left' ? state.skillStates.left : state.skillStates.right;
		const skillType = side === 'left' ? state.selectedSkills.left : state.skillStates.right;
		const cooldown = skillType === 'smash' ? 3 : 5;
		const progress = skillState.cooldownRemaining > 0
			? Math.max(0, Math.min(1, 1 - skillState.cooldownRemaining / cooldown))
			: 1;
		const currentLoader = document.querySelector('.skillLoader') as HTMLElement;
		if (currentLoader) {
			const step = Math.floor(progress * 6);
			let backgroundSize: string = '';
			const color = step == 6 ? '#00e676': '#ffcc00'
			switch (step) {
				case 0:
					backgroundSize = '0% 0%';
					break;
				case 1:
					backgroundSize = '0% 0%';
					break;
				case 2:
					backgroundSize = '20% 20%';
					break;
				case 3:
					backgroundSize = '40% 40%';
					break;
				case 4:
					backgroundSize = '60% 60%';
					break;
				case 5:
					backgroundSize = '80% 80%';
					break;
				case 6:
					backgroundSize = '100% 100%';
					break;
				default:
					backgroundSize = '100% 100%';
			}
			currentLoader.style.setProperty('--skill-gradient-color', color);
			currentLoader.style.backgroundSize = backgroundSize;
		}
	}
	
	public render(gameStatusInfo: GameStatusInfo, timeoutStatus: TimeoutStatus, side: 'left' | 'right' | 'spectator', state: Game3DState): void {
		if (gameStatusInfo.isGameOver) {
			this.clearOverlayById('generic-overlay');
			return;
		}

		this.updateSkillOverlay(side, state);

		let overlay: HTMLElement;
		let text: string = '';
		if ((gameStatusInfo.countdownValue ?? 0) > 0) {
			if (this.previousCount === gameStatusInfo.countdownValue) return;
			this.previousCount = gameStatusInfo.countdownValue ?? 0;
			text = `${gameStatusInfo.countdownValue}`;
		} else if (gameStatusInfo.isPaused) {
			const iAmLeft = side === 'left';
			const opponentDisconnected = iAmLeft ? timeoutStatus.rightActive : timeoutStatus.leftActive;
			const opponentRemainingMs = iAmLeft ? timeoutStatus.rightRemainingMs : timeoutStatus.leftRemainingMs;
			if (opponentDisconnected && opponentRemainingMs > 0) {
				const secondsRemaining = Math.ceil(opponentRemainingMs / 1000);
				text = `⚠️ <span style="color:#ff4d4f">Opponent disconnected.</span> <br> Forfeit in ${secondsRemaining}s`;
			} else {
				text = `Game Paused<br>Press P or ESC to resume`;
			}
		}
		if (text.length > 0) {
			overlay = this.generateOverlay(text);
			if (!document.body.contains(overlay)) {
				document.body.appendChild(overlay);
			}
		} else {
			this.clearOverlayById('generic-overlay');
			this.previousCount = 0;
		}
	}

	private generateOverlay(text: string): HTMLElement {
		const existing = document.getElementById('generic-overlay');
		if (existing) {
			const genericText = existing.querySelector('.generic-text');
			if (genericText) {
				genericText.innerHTML = text;
			}
			return existing;
		}
		
		const overlay = document.createElement('div');
		overlay.id = 'generic-overlay';
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="p-8 text-center max-w-md">
				<h2 class="text-2xl font-bold text-white mb-4 generic-text">
					${text}
				</h2>
			</div>
		`;
		return overlay;
	}
	
	public clearOverlayById(overlayId: string): void {
		const existing = document.getElementById(overlayId);
		if (existing && existing.parentElement) {
			existing.parentElement.removeChild(existing);
		}
	}

	public clearAllOverlays(): void {
		this.clearOverlayById('generic-overlay');
		this.clearOverlayById('game-over-overlay');
		this.clearOverlayById('tournament-game-over-overlay');
	}

	public dispose(): void {
		this.clearAllOverlays();
	}
}
