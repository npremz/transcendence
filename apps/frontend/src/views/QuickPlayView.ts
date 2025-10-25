import type { ViewFunction, CleanupFunction } from "../router/types";
import { Header } from "../components/Header";
import { BackButton } from "../components/Button";

export const QuickPlayView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })}
		<div class="container mx-auto p-6">
			${BackButton({ className: "mb-4" })}
			<h1 class="text-3xl font-bold mb-6">QuickPlay</h1>

			<section class="mb-8">
				<h2 class="text-xl font-semibold text-zinc-800 mb-3">Choisis ton skill</h2>
				<div class="grid gap-4 sm:grid-cols-2" data-skill-options>
					<button
						type="button"
						class="skill-option flex flex-col gap-1.5 px-3 py-2 border border-zinc-200 bg-white rounded-md text-left transition duration-150 text-zinc-800 hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-200/70"
						data-skill-option="smash"
					>
						<div class="flex items-center gap-2 text-zinc-900">
							<span class="text-lg">💥</span>
							<span class="text-sm font-semibold uppercase tracking-wide">Smash</span>
						</div>
						<p class="text-sm text-zinc-600 leading-relaxed">
							Charge une frappe puissante qui renvoie la balle plus vite et peut surprendre l’adversaire.
						</p>
					</button>

					<button
						type="button"
						class="skill-option flex flex-col gap-1.5 px-3 py-2 border border-zinc-200 bg-white rounded-md text-left transition duration-150 text-zinc-800 hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-200/70"
						data-skill-option="dash"
					>
						<div class="flex items-center gap-2 text-zinc-900">
							<span class="text-lg">⚡</span>
							<span class="text-sm font-semibold uppercase tracking-wide">Dash</span>
						</div>
						<p class="text-sm text-zinc-600 leading-relaxed">
							Fais un déplacement rapide avec ta raquette pour rattraper les balles difficiles.
						</p>
					</button>
				</div>
				<p id="selected-skill-label" class="text-sm text-zinc-700 mt-3">
					Skill sélectionné : Smash
				</p>
			</section>
			
			<div class="flex flex-col gap-4 max-w-md">
				<button id="play-online" class="px-6 py-3 bg-green-600 text-white rounded text-center">
					Play Online
				</button>
				<button class="px-6 py-3 bg-gray-400 text-white rounded" disabled>
					Play Local (Coming Soon)
				</button>
				<button class="px-6 py-3 bg-gray-400 text-white rounded" disabled>
					Play vs AI (Coming Soon)
				</button>
			</div>
		</div>
	`;
};

export const quickPlayLogic = (): CleanupFunction => {
	const skillButtons = Array.from(
		document.querySelectorAll<HTMLButtonElement>('[data-skill-option]')
	);
	const playButton = document.getElementById('play-online') as HTMLButtonElement | null;
	const label = document.getElementById('selected-skill-label');
	const ACTIVE_CLASSES = ['border-indigo-400', 'bg-indigo-50', 'text-indigo-900'];
	const INACTIVE_CLASSES = ['border-zinc-200', 'bg-white', 'text-zinc-800'];

	let selectedSkill = (sessionStorage.getItem('selectedSkill') as 'smash' | 'dash' | null) || 'smash';
	sessionStorage.setItem('selectedSkill', selectedSkill);

	const updateUI = () => {
		skillButtons.forEach(btn => {
			const isActive = btn.dataset.skillOption === selectedSkill;
			btn.classList.toggle('ring-1', isActive);
			btn.classList.toggle('ring-indigo-300/70', isActive);

			if (isActive) {
				btn.classList.add(...ACTIVE_CLASSES);
				btn.classList.remove(...INACTIVE_CLASSES);
			} else {
				btn.classList.remove(...ACTIVE_CLASSES);
				btn.classList.add(...INACTIVE_CLASSES);
			}
			btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});

		if (label) {
			label.textContent = `Skill sélectionné : ${selectedSkill === 'smash' ? 'Smash' : 'Dash'}`;
		}
	};

	const handleSkillClick = (event: Event) => {
		event.preventDefault();
		const target = event.currentTarget as HTMLButtonElement | null;
		const skill = target?.dataset.skillOption;
		if (!skill || (skill !== 'smash' && skill !== 'dash')) {
			return;
		}
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
			window.router.navigate('/play/waiting');
		};
		playButton.addEventListener('click', playHandler);
		listeners.push({ element: playButton, handler: playHandler as unknown as (e: Event) => void });
	}

	updateUI();

	return () => {
		listeners.forEach(({ element, handler }) => {
			element.removeEventListener('click', handler);
		});
	};
};
