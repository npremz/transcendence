// apps/frontend/src/views/QuickPlayView.ts
import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

export const QuickPlayView: ViewFunction = () => {
	const content = `
			<div class="flex-1 flex items-center justify-center px-4 py-12">
				<div class="w-full max-w-4xl">
					
					<div class="text-center mb-12">
						<h1 class="pixel-font text-5xl md:text-6xl text-blue-400 mb-4" 
							style="animation: neonPulse 2s ease-in-out infinite;"
							id="quickplay-title">
							⚡ SELECT MODE ⚡
						</h1>
						<p class="pixel-font text-lg text-blue-300 opacity-80">
							>>> SELECT YOUR SKILL <<<
						</p>
					</div>
					<div class="mb-12 neon-border bg-black/50 backdrop-blur-sm rounded-lg p-8" id="skills-section">
						<h2 class="pixel-font text-2xl text-blue-400 mb-6 text-center">
							CHOOSE YOUR ABILITY
						</h2>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6" data-skill-options>
							<div 
								class="skill-card neon-border rounded-lg p-6 relative selected" 
								data-skill-option="smash"
								id="skill-smash"
							>
								<div class="absolute top-3 right-3 pixel-font text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded border border-green-500/50">
									✓ SELECTED
								</div>
							
								<div class="text-5xl mb-4 text-center">💥</div>
								
								<h3 class="pixel-font text-xl text-blue-400 mb-3 text-center uppercase">
									Smash
								</h3>
								
								<p class="pixel-font text-sm text-blue-300 opacity-80 text-center leading-relaxed flex-grow">
									Charge a powerful strike that sends the ball back faster and can surprise your opponent
								</p>
							
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
							
								<div class="absolute bottom-2 left-0 right-0 flex justify-between px-3 pointer-events-none">
									<div class="text-red-500 text-sm opacity-80">←</div>
									<div class="text-red-500 text-sm opacity-80">→</div>
								</div>
							</div>
							
							<div 
								class="skill-card neon-border rounded-lg p-6 relative" 
								data-skill-option="dash"
								id="skill-dash"
							>
								<div class="absolute top-3 right-3 pixel-font text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded border border-green-500/50 hidden">
									✓ SELECTED
								</div>
							
								<div class="text-5xl mb-4 text-center text-blue-500">⚡</div>
								
								<h3 class="pixel-font text-xl text-blue-400 mb-3 text-center uppercase">
									Dash
								</h3>
								
								<p class="pixel-font text-sm text-blue-300 opacity-80 text-center leading-relaxed flex-grow">
									Make a quick move with your paddle to catch difficult balls
								</p>
							
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
							
								<div class="absolute bottom-2 left-0 right-0 flex justify-between px-3 pointer-events-none">
									<div class="text-blue-500 text-sm opacity-80">←</div>
									<div class="text-blue-500 text-sm opacity-80">→</div>
								</div>
							</div>
						</div>

						<div class="mt-6 text-center">
							<p id="selected-skill-label" class="pixel-font text-sm text-blue-300">
								Selected skill: <span class="text-blue-400 font-bold">SMASH</span>
							</p>
						</div>
					</div>

					<div class="space-y-4" id="modes-section">
						<button 
							id="play-online" 
							class="mode-button w-full p-6 neon-border rounded-lg pixel-font text-lg text-blue-400 hover:text-white transition-all relative group"
						>
							<div class="flex items-center justify-between w-full">
								<div class="flex items-center gap-4">
									<span class="text-3xl">🌐</span>
									<div class="text-left">
										<div class="text-xl">PLAY ONLINE</div>
										<div class="text-xs opacity-60 font-normal">Find an opponent and start playing</div>
									</div>
								</div>
								<div class="ml-auto mr-4">
									<div id="view-mode-toggle-container" class="switch-button neon-border rounded-lg pixel-font text-blue-400 overflow-hidden w-28 text-center text-sm tracking-[1px] relative">
										<input id="view-mode-toggle" class="switch-button-checkbox cursor-pointer absolute w-full h-full opacity-0 z-[2] left-0 inset-y-0" type="checkbox" />
										<label class="switch-button-label relative block select-none pointer-events-none px-0 py-[8px]" for="view-mode-toggle">
											<span class="switch-button-label-span relative">2D</span>
										</label>
									</div>
								</div>
								<span class="text-2xl group-hover:translate-x-2 transition-transform">→</span>
							</div>
						</button>

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

export const quickPlayLogic = (): CleanupFunction => {
	const cleanupManager = createCleanupManager();

	// Enregistrer les cibles GSAP
	cleanupManager.registerGsapTarget('#quickplay-title');
	cleanupManager.registerGsapTarget('#skills-section');
	cleanupManager.registerGsapTarget('#modes-section');

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
	const localButton = document.getElementById('play-local') as HTMLButtonElement | null;
	const label = document.getElementById('selected-skill-label');
	const toggleButton = document.getElementById('view-mode-toggle') as HTMLInputElement | null;
	const toggleContainer = document.getElementById('view-mode-toggle-container');

	let selectedSkill = (sessionStorage.getItem('selectedSkill') as 'smash' | 'dash' | null) || 'smash';
	sessionStorage.setItem('selectedSkill', selectedSkill);

	sessionStorage.setItem('viewMode', '2d'); // 2d default

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
	// will be used to prevent propagation when clicking the toggle inside the play button
	if (toggleButton) {
		const toggleHandler = (e: Event) => {
			e.stopPropagation();
		};
		toggleButton.addEventListener('click', toggleHandler);
		listeners.push({ element: toggleButton, handler: toggleHandler as unknown as (e: Event) => void });
	}

	if (toggleContainer) {
		const containerHandler = (e: Event) => {
			e.stopPropagation();
		};
		toggleContainer.addEventListener('click', containerHandler);
		listeners.push({ element: toggleContainer, handler: containerHandler as unknown as (e: Event) => void });
	}

	if (playButton) {
		const playHandler = (event: MouseEvent) => {
			event.preventDefault();
			if (!selectedSkill) {
				selectedSkill = 'smash';
				sessionStorage.setItem('selectedSkill', selectedSkill);
			}
			// which view mode selected
			const viewModeToggle = document.getElementById('view-mode-toggle') as HTMLInputElement | null;
			const is3D = viewModeToggle?.checked || false;
			sessionStorage.setItem('viewMode', is3D ? '3d' : '2d');
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

	// Enregistrer le cleanup des event listeners
	cleanupManager.onCleanup(() => {
		listeners.forEach(({ element, handler }) => {
			element.removeEventListener('click', handler);
		});
	});

	return cleanupManager.getCleanupFunction();
};
