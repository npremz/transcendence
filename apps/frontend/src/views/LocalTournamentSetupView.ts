import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { LocalTournamentManager, type LocalPlayer } from "../utils/localTournamentManager";

export const LocalTournamentSetupView: ViewFunction = () => {
	return `
		<!-- Fond avec grille animée -->
		<div class="fixed inset-0 bg-black overflow-hidden">
			<div class="absolute inset-0" style="
				background-image:
					linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
					linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
				background-size: 50px 50px;
				animation: gridMove 20s linear infinite;
			"></div>

			<style>
				.size-selector {
					cursor: pointer;
					transition: all 0.3s ease;
				}

				.size-selector.active {
					background: rgba(59, 130, 246, 0.3);
					border-color: #60A5FA;
					transform: scale(1.05);
				}
			</style>

			<div class="absolute inset-0 pointer-events-none opacity-10">
				<div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
			</div>
		</div>

		<!-- Contenu principal -->
		<div class="relative z-10 min-h-screen flex flex-col">
			<header class="flex justify-between items-center px-8 py-6">
				<button
					onclick="history.back()"
					class="pixel-font px-6 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
					id="back-button"
				>
					← BACK
				</button>
			</header>

			<div class="flex-1 flex items-center justify-center px-4 py-12">
				<div class="w-full max-w-6xl">

					<!-- Titre principal -->
					<div class="text-center mb-8">
						<h1 class="pixel-font text-4xl md:text-6xl text-blue-400 mb-4"
							style="animation: neonPulse 2s ease-in-out infinite;"
							id="tournament-title">
							🏆 LOCAL TOURNAMENT 🏆
						</h1>
						<p class="pixel-font text-lg text-blue-300 opacity-80">
							>>> MULTIPLAYER CHAMPIONSHIP <<<
						</p>
					</div>

					<!-- Sélection de la taille -->
					<div id="size-selection" class="mb-8">
						<div class="text-center mb-4">
							<p class="pixel-font text-sm text-blue-300">SELECT TOURNAMENT SIZE:</p>
						</div>
						<div class="flex justify-center gap-4">
							<div
								class="size-selector neon-border rounded-lg p-6 text-center active"
								data-size="4"
							>
								<div class="pixel-font text-3xl text-blue-400 mb-2">4</div>
								<div class="pixel-font text-xs text-blue-300">PLAYERS</div>
							</div>
							<div
								class="size-selector neon-border rounded-lg p-6 text-center"
								data-size="8"
							>
								<div class="pixel-font text-3xl text-blue-400 mb-2">8</div>
								<div class="pixel-font text-xs text-blue-300">PLAYERS</div>
							</div>
						</div>
					</div>

					<!-- Formulaire des joueurs -->
					<form id="tournament-setup-form" class="space-y-6">
						<div id="players-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<!-- Players will be generated dynamically -->
						</div>

						<!-- Bouton START -->
						<div class="flex justify-center mt-8">
							<button
								type="submit"
								class="pixel-font px-12 py-4 text-xl neon-border bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-all"
								id="start-tournament-btn"
							>
								START TOURNAMENT
							</button>
						</div>
					</form>

				</div>
			</div>
		</div>
	`;
};

const generateId = (): string => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const generatePlayerCards = (count: number): string => {
	const colors = [
		'blue', 'red', 'green', 'yellow',
		'purple', 'pink', 'cyan', 'orange'
	];

	let html = '';
	for (let i = 0; i < count; i++) {
		const color = colors[i % colors.length];
		html += `
			<div class="player-card neon-border rounded-lg p-4" data-player-index="${i}">
				<div class="mb-3">
					<h3 class="pixel-font text-lg text-${color}-400 mb-2">PLAYER ${i + 1}</h3>
				</div>

				<div class="mb-3">
					<label class="block mb-1 pixel-font text-xs text-${color}-300">
						USERNAME:
					</label>
					<input
						type="text"
						name="player-${i}-name"
						placeholder="Player ${i + 1}"
						maxlength="24"
						required
						class="w-full p-2 rounded pixel-font text-sm neon-input"
					/>
				</div>

				<div>
					<label class="block mb-1 pixel-font text-xs text-${color}-300">
						SKILL:
					</label>
					<select
						name="player-${i}-skill"
						class="w-full p-2 rounded pixel-font text-xs neon-input cursor-pointer"
					>
						<option value="smash">💥 Smash</option>
						<option value="dash">⚡ Dash</option>
					</select>
				</div>
			</div>
		`;
	}
	return html;
};

export const localTournamentSetupLogic = (): CleanupFunction => {
	let currentSize = 4;

	// Fonction pour mettre à jour les cartes de joueurs
	const updatePlayerCards = (size: number) => {
		const container = document.getElementById('players-container');
		if (container) {
			container.innerHTML = generatePlayerCards(size);

			// Animer l'apparition des cartes
			gsap.fromTo(
				'.player-card',
				{ opacity: 0, y: 20 },
				{ opacity: 1, y: 0, duration: 0.3, stagger: 0.05 }
			);
		}
	};

	// Initialiser avec 4 joueurs
	updatePlayerCards(currentSize);

	// Gérer la sélection de la taille
	const sizeSelectors = document.querySelectorAll('.size-selector');
	sizeSelectors.forEach(selector => {
		selector.addEventListener('click', () => {
			const size = parseInt(selector.getAttribute('data-size') || '4');
			currentSize = size;

			// Mettre à jour l'état actif
			sizeSelectors.forEach(s => s.classList.remove('active'));
			selector.classList.add('active');

			// Mettre à jour les cartes de joueurs
			updatePlayerCards(size);
		});
	});

	// Animer le titre
	const title = document.getElementById('tournament-title');
	if (title) {
		gsap.fromTo(
			title,
			{ opacity: 0, scale: 0.5 },
			{ opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
		);
	}

	// Gérer la soumission du formulaire
	const form = document.getElementById('tournament-setup-form') as HTMLFormElement;
	const handleSubmit = (e: Event) => {
		e.preventDefault();

		const formData = new FormData(form);
		const players: Omit<LocalPlayer, 'eliminated'>[] = [];

		// Collecter les données des joueurs
		for (let i = 0; i < currentSize; i++) {
			const username = formData.get(`player-${i}-name`) as string;
			const selectedSkill = formData.get(`player-${i}-skill`) as 'smash' | 'dash';

			if (!username || username.trim() === '') {
				alert(`Please enter a name for Player ${i + 1}`);
				return;
			}

			players.push({
				id: generateId(),
				username: username.trim(),
				selectedSkill,
			});
		}

		// Vérifier les noms en double
		const usernames = players.map(p => p.username.toLowerCase());
		const hasDuplicates = usernames.some((name, index) => usernames.indexOf(name) !== index);
		if (hasDuplicates) {
			alert('Player names must be unique!');
			return;
		}

		try {
			// Créer le tournoi
			const tournament = LocalTournamentManager.createTournament(
				currentSize as 4 | 8,
				players
			);

			console.log('Tournament created:', tournament);

			// Rediriger vers la vue du bracket
			window.router.navigate('/local-tournament-bracket');
		} catch (error) {
			console.error('Error creating tournament:', error);
			alert('Failed to create tournament. Please try again.');
		}
	};

	form?.addEventListener('submit', handleSubmit);

	// Cleanup
	return () => {
		form?.removeEventListener('submit', handleSubmit);
	};
};
