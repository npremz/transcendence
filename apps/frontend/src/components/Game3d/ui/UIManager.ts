import type { GameStatusInfo, TimeoutStatus, Game3DState} from "../types";

export class UIManager {
	private previousCount: number = 0;

	constructor() {
		this.injectStylesAndHtml();
	}

	private injectStylesAndHtml(): void {
		if (document.getElementById('game3d-ui-styles')) return;
		if (document.getElementById('game3d-ui-skill')) return;

		const htmlDiv = document.createElement('div');
		htmlDiv.id = 'game3d-ui-skill';
		htmlDiv.innerHTML = `
			<div id="game3d-skill-container" class="fixed left-1/2 bottom-6 transform -translate-x-1/2 z-50 pointer-events-none">
				<div class="flex flex-col items-center">
					<div id="skill-wrapper" class="skillLoader" aria-hidden="true"></div>
					<div id="skill-cooldown" class="mt-2 text-white/90 text-sm select-none">Skill cooldown</div>
				</div>
			</div>
		`;
		document.body.appendChild(htmlDiv);

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

			/* Skill loader */
			/* HTML: <div class="loader"></div> */
			/* vars */
			:root {
				--skill-gradient-color: #00e676;
			}

			.skillLoader {
				width: 120px;
				height: 60px;
				border-radius: 200px 200px 0 0;
				-webkit-mask: repeating-radial-gradient(farthest-side at bottom ,#0000 0,#000 1px 12%,#0000 calc(12% + 1px) 20%);
				background: radial-gradient(farthest-side at bottom, var(--skill-gradient-color) 0 95%,#0000 0) bottom/0% 0% no-repeat #ddd;
				background-size: 100% 100%;
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

	public showGameOver(didIWin: boolean, score: { left: number; right: number }): HTMLElement {

		const overlay = document.createElement('div');
		overlay.id = 'game-over-overlay';
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-[#0C154D]/90 border-2 border-white/20 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-4xl font-bold mb-4 ${didIWin ? 'text-green-400' : 'text-red-400'}">
					${didIWin ? '🏆 VICTOIRE !' : '💀 DÉFAITE'}
				</h2>
				<p class="text-white/80 text-xl mb-6">
					Score: ${score.left} - ${score.right}
				</p>
				<button 
					id="return-to-lobby"
					class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all cursor-pointer"
				>
					Retour au lobby
				</button>
			</div>
		`;
		return overlay;
	}

	public handleTournamentGameOver(didIWin: boolean, score: { left: number; right: number }): HTMLElement {
		// Handle tournament-specific game over logic here
		const overlay = document.createElement('div');
		overlay.id = 'tournament-game-over-overlay';
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-[#0C154D]/90 border-2 border-white/20 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-4xl font-bold mb-4 ${didIWin ? 'text-green-400' : 'text-red-400'}">
					${didIWin ? '🏆 VICTOIRE TOURNAMENT!' : '💀 DÉFAITE TOURNAMENT!'}
				</h2>
				<p class="text-white/80 text-xl mb-6">
					Score: ${score.left} - ${score.right}
				</p>
				<button 
					id="return-to-lobby"
					class="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all cursor-pointer"
				>
					Retour au lobby
				</button>
			</div>
		`;
		return overlay;
	}

	private updateSkillOverlay(side: 'left' | 'right' | 'spectator', state: Game3DState | null): void {
		console.log('Updating skill overlay for side:', side);
		if (!state) return;
		console.log('Received game state');
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
			console.log('Skill loader step:', step);
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
				text = 'Opponent disconnected. Forfeit in ' + secondsRemaining + 's';
			} else {
				text = 'Game Paused';
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
				genericText.textContent = text;
			}
			return existing;
		}
		
		const overlay = document.createElement('div');
		overlay.id = 'generic-overlay';
		overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-gray-800/70 border-2 border-white/20 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-4xl font-bold text-white mb-4 generic-text">
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
