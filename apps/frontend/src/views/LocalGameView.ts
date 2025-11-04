import type { ViewFunction, CleanupFunction } from "../router/types";

const makeId = () => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const LocalGameView: ViewFunction = () => {
	return `
		<div class="min-h-screen w-full flex items-center justify-center bg-[#04071A] text-white">
			<div class="w-full max-w-3xl mx-4 p-8 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
				<h1 class="text-3xl font-bold mb-6 text-center">Partie Locale</h1>
				<p class="text-white/70 text-center mb-8">
					Jouez à deux sur le même écran. Choisissez vos pseudos et compétences, puis lancez la partie.
				</p>
				<form id="local-game-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-4">
						<h2 class="text-xl font-semibold text-white/80">Joueur 1 (gauche)</h2>
						<div>
							<label class="block text-sm text-white/60 mb-1" for="local-left-name">Pseudo</label>
							<input id="local-left-name" name="left-name" type="text" maxlength="24" placeholder="Joueur 1"
								class="w-full px-4 py-2 rounded bg-white/10 border border-white/10 focus:border-white/40 focus:outline-none" />
						</div>
						<div>
							<label class="block text-sm text-white/60 mb-1" for="local-left-skill">Compétence</label>
							<select id="local-left-skill" name="left-skill"
								class="w-full px-4 py-2 rounded bg-white/10 border border-white/10 focus:border-white/40 focus:outline-none">
								<option value="smash">Smash</option>
								<option value="dash">Dash</option>
							</select>
						</div>
							<div class="text-sm text-white/50">
								<span class="font-semibold text-white/70">Contrôles:</span> W / S pour bouger, Espace pour la compétence.
							</div>
					</div>
					<div class="space-y-4">
						<h2 class="text-xl font-semibold text-white/80">Joueur 2 (droite)</h2>
						<div>
							<label class="block text-sm text-white/60 mb-1" for="local-right-name">Pseudo</label>
							<input id="local-right-name" name="right-name" type="text" maxlength="24" placeholder="Joueur 2"
								class="w-full px-4 py-2 rounded bg-white/10 border border-white/10 focus:border-white/40 focus:outline-none" />
						</div>
						<div>
							<label class="block text-sm text-white/60 mb-1" for="local-right-skill">Compétence</label>
							<select id="local-right-skill" name="right-skill"
								class="w-full px-4 py-2 rounded bg-white/10 border border-white/10 focus:border-white/40 focus:outline-none">
								<option value="smash">Smash</option>
								<option value="dash">Dash</option>
							</select>
						</div>
							<div class="text-sm text-white/50">
								<span class="font-semibold text-white/70">Contrôles:</span> ↑ / ↓ pour bouger, Entrée pour la compétence.
							</div>
					</div>
					<div class="md:col-span-2 flex flex-col gap-3">
						<button type="submit"
							class="px-6 py-3 rounded bg-blue-500/80 hover:bg-blue-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
							Lancer la partie
						</button>
						<button type="button" id="local-back-btn"
							class="px-6 py-3 rounded border border-white/20 hover:bg-white/10 transition-all font-semibold text-white/80">
							Retour
						</button>
						<p id="local-game-feedback" class="text-sm text-red-400 h-5"></p>
					</div>
				</form>
			</div>
		</div>
	`;
};

export const localGameLogic = (): CleanupFunction | void => {
	const form = document.getElementById('local-game-form') as HTMLFormElement | null;
	const feedbackEl = document.getElementById('local-game-feedback');
	const backBtn = document.getElementById('local-back-btn');

	if (!form) {
		return;
	}

	const host = import.meta.env.VITE_HOST || 'localhost:8443';
	const createEndpoint = import.meta.env.VITE_CREATEGAME_ENDPOINT || '/gameback/create';
	const gameEndpoint = import.meta.env.VITE_GAME_ENDPOINT || '/gameback/game';

	const backHandler = () => {
		window.router?.navigateTo('/startgame');
	};

	backBtn?.addEventListener('click', backHandler);

	const submitHandler = async (event: Event) => {
		event.preventDefault();
		const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
		if (submitBtn) {
			submitBtn.disabled = true;
		}
		if (feedbackEl) {
			feedbackEl.textContent = '';
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
				throw new Error(`Erreur serveur (${response.status})`);
			}

			const wsUrl = `wss://${host}${gameEndpoint}/${roomId}`;
			sessionStorage.setItem('gameWsURL', wsUrl);
			sessionStorage.setItem('localGameConfig', JSON.stringify({
				roomId,
				left: { id: leftId, username: leftName, selectedSkill: leftSkill },
				right: { id: rightId, username: rightName, selectedSkill: rightSkill }
			}));

			window.router?.navigateTo(`/game/${roomId}`);
		} catch (err) {
			console.error('Failed to create local game session', err);
			if (feedbackEl) {
				feedbackEl.textContent = err instanceof Error ? err.message : 'Impossible de créer la partie locale.';
			}
		} finally {
			if (submitBtn) {
				submitBtn.disabled = false;
			}
		}
	};

	form.addEventListener('submit', submitHandler);

	return () => {
		form.removeEventListener('submit', submitHandler);
		backBtn?.removeEventListener('click', backHandler);
	};
};
