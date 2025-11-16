import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";

export const QuickPlayView: ViewFunction = () => {
	return `
		<!-- Fond avec grille animée -->
		<div class="fixed inset-0 bg-black overflow-hidden">
			<!-- Grille de fond -->
			<div class="absolute inset-0" style="
				background-image: 
					linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
					linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
				background-size: 50px 50px;
				animation: gridMove 20s linear infinite;
			"></div>
			
			<style>
				@keyframes gridMove {
					0% { transform: translateY(0); }
					100% { transform: translateY(50px); }
				}
				
				@keyframes neonPulse {
					0%, 100% { 
						text-shadow: 
							0 0 10px rgba(59, 130, 246, 0.8),
							0 0 20px rgba(59, 130, 246, 0.6),
							0 0 30px rgba(59, 130, 246, 0.4);
					}
					50% { 
						text-shadow: 
							0 0 20px rgba(59, 130, 246, 1),
							0 0 30px rgba(59, 130, 246, 0.8),
							0 0 40px rgba(59, 130, 246, 0.6);
					}
				}
				
				@keyframes scanline {
					0% { transform: translateY(-100%); }
					100% { transform: translateY(100vh); }
				}
				
				.pixel-font {
					font-family: 'Courier New', monospace;
					font-weight: bold;
					letter-spacing: 0.1em;
				}
				
				.neon-border {
					box-shadow: 
						0 0 10px rgba(59, 130, 246, 0.5),
						inset 0 0 10px rgba(59, 130, 246, 0.2);
					border: 3px solid rgba(59, 130, 246, 0.8);
				}
				
				.neon-border:hover {
					box-shadow: 
						0 0 20px rgba(59, 130, 246, 0.8),
						inset 0 0 20px rgba(59, 130, 246, 0.3);
					border-color: rgba(59, 130, 246, 1);
				}
				
				.skill-card {
					transition: all 0.3s ease;
					background: rgba(15, 23, 42, 0.6);
					backdrop-filter: blur(10px);
					cursor: pointer;
					min-height: 320px;
					display: flex;
					flex-direction: column;
				}
				
				.skill-card:hover {
					transform: translateY(-5px);
					background: rgba(30, 41, 59, 0.8);
				}
				
				.skill-card.selected {
					background: rgba(59, 130, 246, 0.2);
					border-color: rgba(59, 130, 246, 1);
					box-shadow: 
						0 0 20px rgba(59, 130, 246, 0.6),
						inset 0 0 20px rgba(59, 130, 246, 0.3);
				}

				.mode-button {
					transition: all 0.3s ease;
					background: rgba(15, 23, 42, 0.6);
					backdrop-filter: blur(10px);
				}

				.mode-button:hover:not(:disabled) {
					transform: translateY(-3px);
					background: rgba(30, 41, 59, 0.8);
				}

				.mode-button:disabled {
					opacity: 0.4;
					cursor: not-allowed;
				}
			</style>
			
			<!-- Scanline effect -->
			<div class="absolute inset-0 pointer-events-none opacity-10">
				<div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
			</div>
		</div>

		<!-- Contenu principal -->
		<div class="relative z-10 min-h-screen flex flex-col">
			<!-- Header avec BackButton et Sign in -->
			<header class="flex justify-between items-center px-8 py-6">
				<button 
					onclick="history.back()" 
					class="pixel-font px-6 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
					id="back-button"
				>
					← BACK
				</button>
				
				<!-- Bouton Sign in -->
				<a href="/login" 
				   class="pixel-font bg-blue-500 text-black px-6 py-3 text-sm md:text-base hover:bg-blue-400 transition-all neon-border flex items-center gap-2">
					<span>SIGN IN</span>
				</a>
			</header>

			<!-- Zone centrale -->
			<div class="flex-1 flex items-center justify-center px-4 py-12">
				<div class="w-full max-w-4xl">
					
					<!-- Titre principal -->
					<div class="text-center mb-12">
						<h1 class="pixel-font text-5xl md:text-6xl text-blue-400 mb-4" 
							style="animation: neonPulse 2s ease-in-out infinite;"
							id="quickplay-title">
							⚡ QUICKPLAY ⚡
						</h1>
						<p class="pixel-font text-lg text-blue-300 opacity-80">
							>>> SELECT YOUR SKILL <<<
						</p>
					</div>

					<!-- Section Skills -->
					<div class="mb-12 neon-border bg-black/50 backdrop-blur-sm rounded-lg p-8" id="skills-section">
						<h2 class="pixel-font text-2xl text-blue-400 mb-6 text-center">
							CHOOSE YOUR ABILITY
						</h2>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6" data-skill-options>
							<!-- Smash Card -->
							<div 
								class="skill-card neon-border rounded-lg p-6 relative selected" 
								data-skill-option="smash"
								id="skill-smash"
							>
								<!-- Badge sélectionné -->
								<div class="absolute top-3 right-3 pixel-font text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded border border-green-500/50">
									✓ SELECTED
								</div>
							
								<!-- Icône -->
								<div class="text-5xl mb-4 text-center">💥</div>
								
								<!-- Titre -->
								<h3 class="pixel-font text-xl text-blue-400 mb-3 text-center uppercase">
									Smash
								</h3>
								
								<!-- Description -->
								<p class="pixel-font text-sm text-blue-300 opacity-80 text-center leading-relaxed flex-grow">
									Charge a powerful strike that sends the ball back faster and can surprise your opponent
								</p>
							
								<!-- Stats -->
								<div class="mt-4 pt-4 border-t border-blue-500/30 space-y-2">
									<div class="flex justify-between pixel-font text-xs text-blue-300">
										<span>Cooldown:</span>
										<span class="text-yellow-400">3s</span>
									</div>
									<div class="flex justify-between pixel-font text-xs text-blue-300">
										<span>Power:</span>
										<span class="text-green-400">★★★★☆</span>
									</div>
								</div>
							
								<!-- Flèches décoratives MIEUX POSITIONNÉES -->
								<div class="absolute bottom-2 left-0 right-0 flex justify-between px-3 pointer-events-none">
									<div class="text-red-500 text-sm opacity-80">←</div>
									<div class="text-red-500 text-sm opacity-80">→</div>
								</div>
							</div>
							
							<!-- Dash Card -->
							<div 
								class="skill-card neon-border rounded-lg p-6 relative" 
								data-skill-option="dash"
								id="skill-dash"
							>
								<!-- Badge sélectionné (caché par défaut) -->
								<div class="absolute top-3 right-3 pixel-font text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded border border-green-500/50 hidden">
									✓ SELECTED
								</div>
							
								<!-- Icône -->
								<div class="text-5xl mb-4 text-center text-blue-500">⚡</div>
								
								<!-- Titre -->
								<h3 class="pixel-font text-xl text-blue-400 mb-3 text-center uppercase">
									Dash
								</h3>
								
								<!-- Description -->
								<p class="pixel-font text-sm text-blue-300 opacity-80 text-center leading-relaxed flex-grow">
									Make a quick move with your paddle to catch difficult balls
								</p>
							
								<!-- Stats -->
								<div class="mt-4 pt-4 border-t border-blue-500/30 space-y-2">
									<div class="flex justify-between pixel-font text-xs text-blue-300">
										<span>Cooldown:</span>
										<span class="text-yellow-400">5s</span>
									</div>
									<div class="flex justify-between pixel-font text-xs text-blue-300">
										<span>Speed:</span>
										<span class="text-green-400">★★★★★</span>
									</div>
								</div>
							
								<!-- Flèches décoratives MIEUX POSITIONNÉES -->
								<div class="absolute bottom-2 left-0 right-0 flex justify-between px-3 pointer-events-none">
									<div class="text-blue-500 text-sm opacity-80">←</div>
									<div class="text-blue-500 text-sm opacity-80">→</div>
								</div>
							</div>
						</div>

						<!-- Skill sélectionné -->
						<div class="mt-6 text-center">
							<p id="selected-skill-label" class="pixel-font text-sm text-blue-300">
								Selected skill: <span class="text-blue-400 font-bold">SMASH</span>
							</p>
						</div>
					</div>

					<!-- Section Modes de jeu -->
					<div class="space-y-4" id="modes-section">
						<!-- Play Online -->
						<button 
							id="play-online" 
							class="mode-button w-full p-6 neon-border rounded-lg pixel-font text-lg text-blue-400 hover:text-white transition-all relative group"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<span class="text-3xl">🌐</span>
									<div class="text-left">
										<div class="text-xl">PLAY ONLINE</div>
										<div class="text-xs opacity-60 font-normal">Find an opponent and start playing</div>
									</div>
								</div>
								<span class="text-2xl group-hover:translate-x-2 transition-transform">→</span>
							</div>
						</button>

						<!-- Play Local -->
						<button 
							id="play-local"
							class="mode-button w-full p-6 neon-border rounded-lg pixel-font text-lg text-blue-400 hover:text-white transition-all relative group"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<span class="text-3xl">🎮</span>
									<div class="text-left">
										<div class="text-xl">PLAY LOCAL</div>
										<div class="text-xs opacity-60 font-normal">Two players, one screen</div>
									</div>
								</div>
								<span class="text-2xl group-hover:translate-x-2 transition-transform">→</span>
							</div>
						</button>

						<!-- Play vs AI -->
						<button 
							id="play-vs-ai"
							class="mode-button w-full p-6 neon-border rounded-lg pixel-font text-lg text-blue-400 hover:text-white transition-all relative group"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<span class="text-3xl">🤖</span>
									<div class="text-left">
										<div class="text-xl">PLAY VS AI</div>
										<div class="text-xs opacity-60 font-normal">Let the AI control your paddle</div>
									</div>
								</div>
								<span class="text-2xl group-hover:translate-x-2 transition-transform">→</span>
							</div>
						</button>
					</div>

				</div>
			</div>

			<!-- Footer -->
			<footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
				<p>© 2025 PONG - SKILL ISSUE</p>
			</footer>
		</div>
	`;
};

export const quickPlayLogic = (): CleanupFunction => {
	// Animations d'entrée
	gsap.from('#quickplay-title', {
		scale: 0.5,
		opacity: 0,
		duration: 1,
		ease: 'back.out(1.7)'
	});

	gsap.from('#skills-section', {
		y: 50,
		opacity: 0,
		duration: 0.8,
		delay: 0.3,
		ease: 'power2.out'
	});

	gsap.from('#modes-section', {
		y: 50,
		opacity: 0,
		duration: 0.8,
		delay: 0.5,
		ease: 'power2.out'
	});

	const skillButtons = Array.from(
		document.querySelectorAll<HTMLButtonElement>('[data-skill-option]')
	);
	const playButton = document.getElementById('play-online') as HTMLButtonElement | null;
	const playVsAIButton = document.getElementById('play-vs-ai') as HTMLButtonElement | null;
	const localButton = document.getElementById('play-local') as HTMLButtonElement | null;
	const label = document.getElementById('selected-skill-label');

	let selectedSkill = (sessionStorage.getItem('selectedSkill') as 'smash' | 'dash' | null) || 'smash';
	sessionStorage.setItem('selectedSkill', selectedSkill);

	const updateUI = () => {
		skillButtons.forEach(btn => {
			const isActive = btn.dataset.skillOption === selectedSkill;
			const badge = btn.querySelector('.absolute.top-3.right-3');
			
			if (isActive) {
				btn.classList.add('selected');
				badge?.classList.remove('hidden');
			} else {
				btn.classList.remove('selected');
				badge?.classList.add('hidden');
			}
			
			btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});

		if (label) {
			const skillName = selectedSkill === 'smash' ? 'SMASH' : 'DASH';
			label.innerHTML = `Selected skill: <span class="text-blue-400 font-bold">${skillName}</span>`;
		}
	};

	const handleSkillClick = (event: Event) => {
		event.preventDefault();
		const target = event.currentTarget as HTMLButtonElement | null;
		const skill = target?.dataset.skillOption;
		if (!skill || (skill !== 'smash' && skill !== 'dash')) {
			return;
		}
		
		// Animation de sélection
		gsap.to(target, {
			scale: 0.95,
			duration: 0.1,
			yoyo: true,
			repeat: 1
		});

		selectedSkill = skill;
		sessionStorage.setItem('selectedSkill', selectedSkill);
		updateUI();
	};

	const listeners: Array<{ element: HTMLElement; handler: (event: Event) => void }> = [];

	skillButtons.forEach(btn => {
		const handler = handleSkillClick.bind(btn);
		btn.addEventListener('click', handler);
		listeners.push({ element: btn, handler });
	});

	if (playButton) {
		const playHandler = (event: MouseEvent) => {
			event.preventDefault();
			if (!selectedSkill) {
				selectedSkill = 'smash';
				sessionStorage.setItem('selectedSkill', selectedSkill);
			}
			
			// Animation du bouton
			gsap.to(playButton, {
				scale: 0.95,
				duration: 0.1,
				yoyo: true,
				repeat: 1,
				onComplete: () => {
					window.router.navigate('/play/waiting');
				}
			});
		};
		playButton.addEventListener('click', playHandler);
		listeners.push({ element: playButton, handler: playHandler as unknown as (e: Event) => void });
	}

	if (playVsAIButton) {
		const playAIHandler = async (event: MouseEvent) => {
			event.preventDefault();
			if (!selectedSkill) {
				selectedSkill = 'smash';
				sessionStorage.setItem('selectedSkill', selectedSkill);
			}

			const host = import.meta.env.VITE_HOST || 'localhost:8443';
			const createEndpoint = import.meta.env.VITE_CREATEGAME_ENDPOINT || '/gameback/create';
			const gameEndpoint = import.meta.env.VITE_GAME_ENDPOINT || '/gameback/game';
			const makeId = () => {
				if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
					return crypto.randomUUID();
				}
				return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
			};

			const roomId = makeId();
			const aiId = `ai-${makeId()}`;
			const username = window.simpleAuth.getUsername?.() || 'Player';
			const playerId = window.simpleAuth.getPlayerId?.();
			if (!playerId) {
				console.warn('QuickPlay: no playerId, redirecting to login');
				window.router.navigate('/login');
				return;
			}

			try {
				const response = await fetch(`https://${host}${createEndpoint}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						roomId,
						player1: { id: playerId, username, selectedSkill },
						player2: { id: aiId, username: 'AI', selectedSkill: 'smash' }
					})
				});
				if (!response.ok) {
					throw new Error(`Server error (${response.status})`);
				}

				const wsUrl = `wss://${host}${gameEndpoint}/${roomId}`;
				sessionStorage.setItem('gameWsURL', wsUrl);
				sessionStorage.setItem('aiPlayerId', aiId);
				sessionStorage.setItem('aiSide', 'right');

				gsap.to(playVsAIButton, {
					scale: 0.95,
					duration: 0.1,
					yoyo: true,
					repeat: 1,
					onComplete: () => {
						window.router.navigate(`/game/${roomId}`);
					}
				});
			} catch (err) {
				console.error('QuickPlay: failed to create AI match', err);
			}
		};
		playVsAIButton.addEventListener('click', playAIHandler);
		listeners.push({ element: playVsAIButton, handler: playAIHandler as unknown as (e: Event) => void });
	}

	if (localButton) {
		const localHandler = (event: MouseEvent) => {
			event.preventDefault();
			gsap.to(localButton, {
				scale: 0.95,
				duration: 0.1,
				yoyo: true,
				repeat: 1,
				onComplete: () => {
					window.router?.navigateTo('/local');
				}
			});
		};
		localButton.addEventListener('click', localHandler);
		listeners.push({ element: localButton, handler: localHandler as unknown as (e: Event) => void });
	}

	updateUI();

	return () => {
		listeners.forEach(({ element, handler }) => {
			element.removeEventListener('click', handler);
		});
	};
};
