import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

const makeId = () => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const LocalGameView: ViewFunction = () => {
	const content = `
			<style>
				.control-hint {
					background: rgba(59, 130, 246, 0.1);
					border: 1px solid rgba(59, 130, 246, 0.3);
				}
			</style>

			<!-- Zone centrale -->
			<div class="flex-1 flex items-center justify-center px-4 py-12">
				<div class="w-full max-w-6xl">
					
					<!-- Titre principal -->
					<div class="text-center mb-12">
						<h1 class="pixel-font text-5xl md:text-7xl text-blue-400 mb-4" 
							style="animation: neonPulse 2s ease-in-out infinite;"
							id="local-title">
							🎮 LOCAL GAME 🎮
						</h1>
						<p class="pixel-font text-lg text-blue-300 opacity-80">
							>>> TWO PLAYERS - ONE SCREEN <<<
						</p>
					</div>

					<!-- Formulaire -->
					<form id="local-game-form" class="space-y-8">
						<!-- Grid pour les deux joueurs -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							
							<!-- Joueur 1 (Gauche) -->
							<div class="player-card neon-border rounded-lg p-6" id="player-left-card" style="opacity: 0; transform: translateX(-100px);">
								<!-- Header -->
								<div class="flex items-center justify-between mb-6">
									<h2 class="pixel-font text-2xl text-blue-400 ">PLAYER 1</h2>
								</div>

								<!-- Username -->
								<div class="mb-4">
									<label for="local-left-name" class="block mb-2 pixel-font text-sm text-blue-300">
										USERNAME:
									</label>
									<input 
										type="text" 
										id="local-left-name" 
										name="left-name"
										placeholder="Player 1"
										maxlength="24"
										required
										class="w-full p-3 rounded pixel-font text-sm neon-input"
									/>
								</div>

								<!-- Skill -->
								<div class="mb-6">
									<label for="local-left-skill" class="block mb-2 pixel-font text-sm text-blue-300">
										SKILL:
									</label>
									<select 
										id="local-left-skill" 
										name="left-skill"
										class="w-full p-3 rounded pixel-font text-sm neon-input cursor-pointer"
									>
										<option value="smash">💥 Smash</option>
										<option value="dash">⚡ Dash</option>
									</select>
								</div>

								<!-- Contrôles -->
								<div class="control-hint rounded-lg p-4">
									<div class="pixel-font text-xs text-blue-300 mb-2 font-bold">
										CONTROLS:
									</div>
									<div class="space-y-1 pixel-font text-xs text-blue-300/80">
										<div>W / S → Move paddle</div>
										<div>SPACE → Use skill</div>
									</div>
								</div>
							</div>

							<!-- Joueur 2 (Droite) -->
							<div class="player-card neon-border rounded-lg p-6" id="player-right-card" style="opacity: 0; transform: translateX(100px);">
								<!-- Header -->
								<div class="flex items-center justify-between mb-6">
									<h2 class="pixel-font text-2xl text-red-500">PLAYER 2</h2>
								</div>

								<!-- Username -->
								<div class="mb-4">
									<label for="local-right-name" class="block mb-2 pixel-font text-sm text-red-400">
										USERNAME:
									</label>
									<input 
										type="text" 
										id="local-right-name" 
										name="right-name"
										placeholder="Player 2"
										maxlength="24"
										required
										class="w-full p-3 rounded pixel-font text-sm neon-input"
									/>
								</div>

								<!-- Skill -->
								<div class="mb-6">
									<label for="local-right-skill" class="block mb-2 pixel-font text-sm text-red-400">
										SKILL:
									</label>
									<select 
										id="local-right-skill" 
										name="right-skill"
										class="w-full p-3 rounded pixel-font text-sm neon-input cursor-pointer"
									>
										<option value="smash">💥 Smash</option>
										<option value="dash">⚡ Dash</option>
									</select>
								</div>

								<!-- Contrôles -->
								<div class="control-hint rounded-lg p-4">
									<div class="pixel-font text-xs text-red-400 mb-2 font-bold">
										CONTROLS:
									</div>
									<div class="space-y-1 pixel-font text-xs text-red-400/80">
										<div>↑ / ↓ → Move paddle</div>
										<div>ENTER → Use skill</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Message d'erreur -->
						<div id="local-game-feedback" class="hidden neon-border bg-red-500/10 rounded-lg p-4 text-center">
							<p class="pixel-font text-sm text-red-400"></p>
						</div>

						<!-- Boutons d'action -->
						<div class="flex flex-col gap-4">
							<!-- Bouton START -->
							<button 
								type="submit" 
								class="w-full py-4 pixel-font text-lg neon-border bg-green-500/20 text-green-400 hover:bg-green-500/40 hover:text-white transition-all relative group"
								id="start-btn"
							>
								<span class="relative z-10">>>> START GAME <<<</span>
								<div class="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/10 transition-all rounded"></div>
							</button>

							<!-- Bouton RETOUR -->
							<button 
								type="button" 
								id="local-back-btn"
								class="w-full py-3 pixel-font text-sm neon-border bg-transparent text-blue-400 hover:bg-blue-500/20 transition-all"
							>
								← BACK TO MENU
							</button>
						</div>
					</form>

					<!-- Info supplémentaire -->
					<div class="mt-8 text-center">
						<div class="inline-block neon-border bg-blue-500/10 rounded-lg px-6 py-3">
							<p class="pixel-font text-xs text-blue-300/60">
								💡 TIP: Choose different skills for more strategic gameplay!
							</p>
						</div>
					</div>
				</div>
			</div>
	`;

	return Layout.render(content, {
		showBackButton: true,
		showSignInButton: true,
		showFooter: true
	});
};

export const localGameLogic = (): CleanupFunction | void => {
	const cleanupManager = createCleanupManager();

	// Enregistrer les cibles GSAP
	cleanupManager.registerGsapTarget('#local-title');
	cleanupManager.registerGsapTarget('#player-left-card');
	cleanupManager.registerGsapTarget('#player-right-card');
	cleanupManager.registerGsapTarget('#local-game-feedback');

	// Animations d'entrée - UNE SEULE FOIS
	gsap.to('#local-title', {
		scale: 1,
		opacity: 1,
		duration: 1,
		ease: 'back.out(1.7)'
	});

	gsap.to('#player-left-card', {
		x: 0,
		opacity: 1,
		duration: 0.8,
		delay: 0.3,
		ease: 'power2.out'
	});

	gsap.to('#player-right-card', {
		x: 0,
		opacity: 1,
		duration: 0.8,
		delay: 0.3,
		ease: 'power2.out'
	});

	const form = document.getElementById('local-game-form') as HTMLFormElement | null;
	const feedbackEl = document.getElementById('local-game-feedback');
	const feedbackText = feedbackEl?.querySelector('p');
	const backBtn = document.getElementById('local-back-btn');

	if (!form) {
		return;
	}

	const host = import.meta.env.VITE_HOST || 'localhost:8443';
	const createEndpoint = import.meta.env.VITE_CREATEGAME_ENDPOINT || '/gameback/create';
	const gameEndpoint = import.meta.env.VITE_GAME_ENDPOINT || '/gameback/game';

	const showError = (message: string) => {
		if (feedbackEl && feedbackText) {
			feedbackText.textContent = message;
			feedbackEl.classList.remove('hidden');
			
			// Animation de l'erreur
			gsap.fromTo(feedbackEl, 
				{ scale: 0.8, opacity: 0 },
				{ scale: 1, opacity: 1, duration: 0.3, ease: 'back.out' }
			);
		}
	};

	const hideError = () => {
		if (feedbackEl) {
			feedbackEl.classList.add('hidden');
		}
	};

	const backHandler = () => {
		window.router?.goBack();
	};

	backBtn?.addEventListener('click', backHandler);

	const submitHandler = async (event: Event) => {
		event.preventDefault();
		hideError();
		
		const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
		if (submitBtn) {
			submitBtn.disabled = true;
			
			// Animation du bouton
			gsap.to(submitBtn, {
				scale: 0.95,
				duration: 0.1,
				yoyo: true,
				repeat: 1
			});
		}

		const leftName = (form.querySelector<HTMLInputElement>('input[name="left-name"]')?.value.trim() || 'Player 1');
		const rightName = (form.querySelector<HTMLInputElement>('input[name="right-name"]')?.value.trim() || 'Player 2');
		const leftSkill = (form.querySelector<HTMLSelectElement>('select[name="left-skill"]')?.value === 'dash') ? 'dash' : 'smash';
		const rightSkill = (form.querySelector<HTMLSelectElement>('select[name="right-skill"]')?.value === 'dash') ? 'dash' : 'smash';

		const roomId = makeId();
		const leftId = makeId();
		const rightId = makeId();

		try {
			const response = await fetch(`https://${host}${createEndpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					roomId,
					player1: { id: leftId, username: leftName, selectedSkill: leftSkill },
					player2: { id: rightId, username: rightName, selectedSkill: rightSkill }
				})
			});

			if (!response.ok) {
				throw new Error(`Server error (${response.status})`);
			}

			const wsUrl = `wss://${host}${gameEndpoint}/${roomId}`;
			sessionStorage.setItem('gameWsURL', wsUrl);
			sessionStorage.setItem('localGameConfig', JSON.stringify({
				roomId,
				left: { id: leftId, username: leftName, selectedSkill: leftSkill },
				right: { id: rightId, username: rightName, selectedSkill: rightSkill }
			}));

			// Redirection immédiate
			window.router?.navigateTo(`/game/${roomId}`);
		} catch (err) {
			console.error('Failed to create local game session', err);
			showError(err instanceof Error ? err.message : 'Unable to create local game.');
			
			if (submitBtn) {
				submitBtn.disabled = false;
			}
		}
	};

	form.addEventListener('submit', submitHandler);

	// Enregistrer le cleanup
	cleanupManager.onCleanup(() => {
		form.removeEventListener('submit', submitHandler);
		backBtn?.removeEventListener('click', backHandler);
	});

	return cleanupManager.getCleanupFunction();
};
