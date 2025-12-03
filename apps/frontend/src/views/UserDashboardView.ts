import type { ViewFunction } from "../router/types";
import { Layout } from "../components/Layout";
import { gsap } from "gsap";
import { createCleanupManager } from "../utils/CleanupManager";

type UserRecord = {
	id: string;
	username: string;
	created_at: string;
	last_seen?: string;
	avatar?: string;
};

type GameHistory = {
	id: string;
	room_id: string;
	game_type: "quickplay" | "tournament";
	player_left_username: string;
	player_right_username: string;
	winner_username?: string;
	score_left: number;
	score_right: number;
	end_reason?: "score" | "timeout" | "forfeit";
	created_at: string;
	duration_seconds?: number;
	tournament_id?: string;
};

export const UserDashboardView: ViewFunction = () => {
	const content = `
		<div class="flex-1 w-full max-w-6xl mx-auto px-4 py-10 space-y-8">
			<!-- Header with search -->
			<div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<p class="pixel-font text-xs text-blue-300/70 tracking-[0.2em] mb-1">PLAYER INSIGHT</p>
					<h1 class="pixel-font text-4xl md:text-5xl text-blue-400" id="dashboard-title" style="animation: neonPulse 2s ease-in-out infinite;">
						USER DASHBOARD
					</h1>
					<p class="pixel-font text-sm text-blue-300/70 mt-2" id="dashboard-subtitle">
						Visualisez vos stats ou recherchez un autre joueur.
					</p>
				</div>

				<!-- Compact search bar -->
				<div class="flex flex-col gap-2 w-full md:w-auto">
					<form id="user-search-form" class="flex gap-2">
						<input
							type="text"
							id="user-search-input"
							class="pixel-font text-xs px-3 py-2 rounded neon-input w-full md:w-48"
							placeholder="Rechercher un joueur..."
							autocomplete="off"
						/>
						<button
							type="submit"
							class="pixel-font text-xs px-4 py-2 neon-border bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 transition-all whitespace-nowrap"
							id="user-search-btn"
						>
							🔍 GO
						</button>
					</form>
					<div class="flex gap-2 justify-end">
						<button
							type="button"
							class="pixel-font text-[10px] px-3 py-1 neon-border bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all"
							id="show-self"
						>
							Mon profil
						</button>
						<button
							type="button"
							class="pixel-font text-[10px] px-3 py-1 neon-border bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
							id="reset-dashboard"
						>
							Clear
						</button>
					</div>
				</div>
			</div>

			<div id="dashboard-status" class="pixel-font text-sm text-center text-blue-300/80"></div>

			<!-- Main profile card (full width) -->
			<div class="neon-border bg-gradient-to-br from-blue-900/40 via-black/60 to-black rounded-xl p-8 space-y-6" id="main-profile">
				<div class="flex flex-col md:flex-row items-center md:items-start gap-6">
					<!-- Avatar -->
					<div class="flex-shrink-0">
						<div class="relative w-32 h-32 rounded-full overflow-hidden border-2 border-blue-500/60 bg-blue-900/60 shadow-lg group cursor-pointer" id="avatar-container">
							<img
								src="/sprites/cat.gif"
								alt="Avatar"
								class="w-full h-full object-cover"
								style="image-rendering: pixelated;"
								id="profile-avatar"
							/>
							<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" id="avatar-edit-overlay">
								<span class="pixel-font text-xs text-blue-200">✏️ EDIT</span>
							</div>
						</div>
					</div>

					<!-- User info -->
					<div class="flex-1 space-y-4 text-center md:text-left">
						<div>
							<p class="pixel-font text-xs text-blue-300/70 uppercase tracking-[0.25em]" id="profile-label">Profil</p>
							<div class="flex items-center gap-3 justify-center md:justify-start mt-2">
								<h2 class="pixel-font text-4xl text-blue-100" id="profile-username">—</h2>
								<button
									class="pixel-font text-xs px-3 py-1 neon-border bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 transition-all opacity-0 hidden"
									id="edit-username-btn"
									title="Changer le username"
								>
									✏️
								</button>
							</div>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
								<p class="pixel-font text-[11px] text-blue-300/70">INSCRIT LE</p>
								<p class="pixel-font text-sm text-blue-100 mt-1" id="profile-created">—</p>
							</div>
							<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
								<p class="pixel-font text-[11px] text-blue-300/70">DERNIÈRE VISITE</p>
								<p class="pixel-font text-sm text-blue-100 mt-1" id="profile-last-seen">—</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal: Edit Username -->
			<div id="username-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
				<div class="neon-border bg-gradient-to-br from-blue-900/90 via-black to-black rounded-xl p-8 max-w-md w-full space-y-6">
					<div class="flex items-center justify-between">
						<h3 class="pixel-font text-2xl text-blue-300">Changer le username</h3>
						<button id="close-username-modal" class="pixel-font text-blue-400 hover:text-white transition-colors text-2xl">✕</button>
					</div>

					<div class="space-y-4">
						<div>
							<label class="pixel-font text-xs text-blue-300/70 block mb-2">NOUVEAU USERNAME</label>
							<input
								type="text"
								id="new-username-input"
								class="w-full pixel-font text-sm px-4 py-3 rounded neon-input"
								placeholder="3-20 caractères"
								autocomplete="off"
								maxlength="20"
							/>
							<p class="pixel-font text-xs mt-2 text-blue-300/70" id="username-hint"></p>
							<p class="pixel-font text-xs mt-2 hidden" id="username-availability"></p>
						</div>

						<div class="flex gap-3">
							<button
								id="cancel-username-btn"
								class="flex-1 pixel-font text-sm px-6 py-3 neon-border bg-transparent text-blue-300 hover:bg-blue-950/40 transition-all"
							>
								Annuler
							</button>
							<button
								id="save-username-btn"
								class="flex-1 pixel-font text-sm px-6 py-3 neon-border bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								disabled
							>
								Sauvegarder
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal: Select Avatar -->
			<div id="avatar-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
				<div class="neon-border bg-gradient-to-br from-blue-900/90 via-black to-black rounded-xl p-8 max-w-2xl w-full space-y-6">
					<div class="flex items-center justify-between">
						<h3 class="pixel-font text-2xl text-blue-300">Choisir un avatar</h3>
						<button id="close-avatar-modal" class="pixel-font text-blue-400 hover:text-white transition-colors text-2xl">✕</button>
					</div>

					<!-- Custom upload section -->
					<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
						<label for="custom-avatar-upload" class="pixel-font text-xs text-blue-300/70 block mb-2">IMPORTER UNE IMAGE PERSONNALISÉE</label>
						<input
							type="file"
							id="custom-avatar-upload"
							accept="image/*"
							class="hidden"
						/>
						<button
							id="trigger-upload"
							class="w-full pixel-font text-sm px-6 py-3 neon-border bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 transition-all"
						>
							📁 Parcourir...
						</button>
						<p class="pixel-font text-[10px] text-blue-300/50 mt-2">PNG, JPG, GIF (max 500KB)</p>
					</div>

					<!-- Predefined avatars -->
					<div>
						<p class="pixel-font text-xs text-blue-300/70 mb-3">OU CHOISIR UN AVATAR PRÉDÉFINI</p>
						<div class="grid grid-cols-3 md:grid-cols-4 gap-4" id="avatar-grid">
							<!-- Avatars will be loaded here -->
						</div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="stat-cards">
				<div class="p-5 rounded-xl neon-border bg-blue-950/20">
					<p class="pixel-font text-[11px] text-blue-300/70 uppercase tracking-[0.25em]">Parties</p>
					<p class="pixel-font text-3xl text-blue-100 mt-2" data-stat-total>—</p>
					<p class="pixel-font text-xs text-blue-300/70 mt-1">Total jouées</p>
				</div>
				<div class="p-5 rounded-xl neon-border bg-blue-950/20">
					<p class="pixel-font text-[11px] text-green-300/70 uppercase tracking-[0.25em]">Victoires</p>
					<p class="pixel-font text-3xl text-green-300 mt-2" data-stat-wins>—</p>
					<p class="pixel-font text-xs text-green-200/70 mt-1">Wins / Losses</p>
				</div>
				<div class="p-5 rounded-xl neon-border bg-blue-950/20">
					<p class="pixel-font text-[11px] text-pink-300/70 uppercase tracking-[0.25em]">Winrate</p>
					<p class="pixel-font text-3xl text-pink-300 mt-2" data-stat-winrate>—</p>
					<p class="pixel-font text-xs text-pink-200/70 mt-1">Quickplay & Tournament</p>
				</div>
			</div>

			<div class="neon-border bg-black/50 backdrop-blur-sm rounded-xl p-6 space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="pixel-font text-[11px] text-blue-300/70 uppercase tracking-[0.25em]">Timeline</p>
						<h3 class="pixel-font text-2xl text-blue-200">Dernières parties</h3>
					</div>
					<div class="pixel-font text-xs text-blue-300/70" id="recent-count"></div>
				</div>
				<div id="recent-games" class="space-y-3">
					<p class="pixel-font text-sm text-blue-300/70">Aucune donnée chargée. Recherchez un utilisateur.</p>
				</div>
			</div>
		</div>
	`;

	return Layout.render(content, {
		showBackButton: true,
		showFooter: true
	});
};

export const userDashboardLogic = (): (() => void) => {
	const cleanupManager = createCleanupManager();

	const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
	const host = (hostRaw || '').replace(/^https?:\/\//, '').trim();

	const form = document.getElementById("user-search-form") as HTMLFormElement | null;
	const input = document.getElementById("user-search-input") as HTMLInputElement | null;
	const statusEl = document.getElementById("dashboard-status");
	const resetBtn = document.getElementById("reset-dashboard");
	const showSelfBtn = document.getElementById("show-self");
	const profileLabel = document.getElementById("profile-label");
	const profileUsername = document.getElementById("profile-username");
	const profileCreated = document.getElementById("profile-created");
	const profileLastSeen = document.getElementById("profile-last-seen");
	const profileAvatar = document.getElementById("profile-avatar") as HTMLImageElement | null;
	const statTotal = document.querySelector("[data-stat-total]");
	const statWins = document.querySelector("[data-stat-wins]");
	const statWinrate = document.querySelector("[data-stat-winrate]");
	const recentGamesContainer = document.getElementById("recent-games");
	const recentCount = document.getElementById("recent-count");

	let currentDisplayedUser: string | null = null;

	const setStatus = (text: string, tone: "info" | "error" = "info") => {
		if (!statusEl) return;
		statusEl.textContent = text;
		statusEl.classList.toggle("text-red-400", tone === "error");
		statusEl.classList.toggle("text-blue-300/80", tone === "info");
	};

	const clearStatus = () => setStatus("");

	const formatDate = (value?: string) => {
		if (!value) return "—";
		const date = new Date(value);
		return isNaN(date.getTime()) ? value : date.toLocaleString();
	};

	const getCurrentUsername = (): string | null => {
		const auth = (window as any).simpleAuth;
		const username = auth?.getUsername?.() || null;
		const loggedIn = auth?.isLoggedIn?.() ?? false;
		return loggedIn && username && username !== 'Anon' ? username : null;
	};

	const renderProfile = (user: UserRecord | null, isSelf: boolean = false) => {
		const editUsernameBtn = document.getElementById('edit-username-btn');
		const avatarEditOverlay = document.getElementById('avatar-edit-overlay');

		if (!user) {
			if (profileLabel) profileLabel.textContent = "Profil";
			if (profileUsername) profileUsername.textContent = "Aucun profil chargé";
			if (profileCreated) profileCreated.textContent = "—";
			if (profileLastSeen) profileLastSeen.textContent = "—";
			if (profileAvatar) profileAvatar.src = '/sprites/cat.gif';
			if (editUsernameBtn) {
				editUsernameBtn.classList.add('hidden', 'opacity-0');
			}
			if (avatarEditOverlay) {
				avatarEditOverlay.classList.add('hidden');
			}
			return;
		}

		currentDisplayedUser = user.username;
		if (profileLabel) profileLabel.textContent = isSelf ? "Mon profil" : "Profil de " + user.username;
		if (profileUsername) profileUsername.textContent = user.username;
		if (profileCreated) profileCreated.textContent = formatDate(user.created_at);
		if (profileLastSeen) profileLastSeen.textContent = formatDate(user.last_seen);

		// Afficher l'avatar depuis la DB ou le défaut
		if (profileAvatar) {
			profileAvatar.src = user.avatar || '/sprites/cat.gif';
		}

		// Montrer les boutons d'édition seulement pour son propre profil
		if (editUsernameBtn) {
			if (isSelf) {
				editUsernameBtn.classList.remove('hidden');
				setTimeout(() => editUsernameBtn.classList.remove('opacity-0'), 100);
			} else {
				editUsernameBtn.classList.add('hidden', 'opacity-0');
			}
		}

		if (avatarEditOverlay) {
			if (isSelf) {
				avatarEditOverlay.classList.remove('hidden');
			} else {
				avatarEditOverlay.classList.add('hidden');
			}
		}
	};

	const renderStats = (games: GameHistory[], username: string) => {
		const total = games.length;
		const wins = games.filter(g => g.winner_username === username).length;
		const losses = total - wins;
		const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;

		if (statTotal) statTotal.textContent = total ? String(total) : "0";
		if (statWins) statWins.textContent = total ? `${wins} / ${losses}` : "0 / 0";
		if (statWinrate) statWinrate.textContent = `${winrate}%`;
	};

	const renderRecentGames = (games: GameHistory[], username: string) => {
		if (!recentGamesContainer) return;
		if (!games.length) {
			const message = username
				? "Aucune partie trouvée pour ce joueur."
				: "Aucune donnée chargée. Recherchez un utilisateur.";
			recentGamesContainer.innerHTML = `<p class="pixel-font text-sm text-blue-300/70">${message}</p>`;
			if (recentCount) recentCount.textContent = "";
			return;
		}

		const items = games
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 6)
			.map(game => {
				const isWinner = game.winner_username === username;
				const vs =
					game.player_left_username === username ? game.player_right_username : game.player_left_username;

				return `
					<div class="p-4 rounded-lg border border-blue-500/30 bg-blue-950/20 flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<span class="pixel-font text-xs px-3 py-1 rounded-full ${
								game.game_type === "tournament" ? "bg-pink-500/20 text-pink-200" : "bg-blue-500/20 text-blue-200"
							}">
								${game.game_type.toUpperCase()}
							</span>
							<span class="pixel-font text-[11px] text-blue-300/70">${formatDate(game.created_at)}</span>
						</div>
						<div class="flex items-center justify-between">
							<div>
								<p class="pixel-font text-sm text-blue-100">vs ${vs}</p>
								<p class="pixel-font text-xs text-blue-300/70">Room ${game.room_id}</p>
							</div>
							<div class="text-right">
								<p class="pixel-font text-lg ${isWinner ? "text-green-300" : "text-red-300"}">
									${game.score_left} - ${game.score_right}
								</p>
								<p class="pixel-font text-xs text-blue-300/70">${game.winner_username ? `Winner: ${game.winner_username}` : "—"}</p>
							</div>
						</div>
					</div>
				`;
			})
			.join("");

		recentGamesContainer.innerHTML = items;
		if (recentCount) recentCount.textContent = `${Math.min(games.length, 6)} sur ${games.length}`;
	};


	const loadProfile = async (username: string, isSelf: boolean = false) => {
		if (!username) {
			setStatus("Merci de saisir un username.", "error");
			return;
		}

		setStatus("Chargement en cours...");
		renderProfile(null);
		renderStats([], username);
		renderRecentGames([], username);

		try {
			const [userRes, historyRes] = await Promise.all([
				fetch(`https://${host}/userback/users?username=${encodeURIComponent(username)}`, { credentials: 'include' }),
				fetch(`https://${host}/gamedb/games/history`, { credentials: 'include' })
			]);

			const userData = await userRes.json().catch(() => ({}));
			if (!userRes.ok || !userData?.success) {
				throw new Error(userData?.error || "Utilisateur introuvable");
			}

			const historyData = await historyRes.json().catch(() => ({}));
			if (!historyRes.ok || !historyData?.success) {
				throw new Error(historyData?.error || "Impossible de charger l'historique");
			}

			const games: GameHistory[] = (historyData.games || []).filter(
				(g: GameHistory) =>
					g.player_left_username === username ||
					g.player_right_username === username ||
					g.winner_username === username
			);

			renderProfile(userData.user as UserRecord, isSelf);
			renderStats(games, username);
			renderRecentGames(games, username);
			setStatus(isSelf ? "Votre profil est chargé" : `Profil de ${username} chargé`);

			if (!isSelf) {
				localStorage.setItem("pong:last-dashboard-user", username);
			}
		} catch (err) {
			console.error(err);
			setStatus(err instanceof Error ? err.message : "Erreur inattendue", "error");
		}
	};

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		const username = input?.value.trim() || "";
		void loadProfile(username, false);
	};

	const handleShowSelf = () => {
		const selfUsername = getCurrentUsername();
		if (!selfUsername) {
			setStatus("Connectez-vous pour voir votre profil", "error");
			return;
		}
		if (input) input.value = "";
		void loadProfile(selfUsername, true);
	};

	const handleReset = () => {
		if (input) input.value = "";
		renderProfile(null);
		renderStats([], "");
		renderRecentGames([], "");
		clearStatus();
		localStorage.removeItem("pong:last-dashboard-user");
		currentDisplayedUser = null;
	};

	// ====================
	// USERNAME MODAL LOGIC
	// ====================
	const usernameModal = document.getElementById('username-modal');
	const editUsernameBtn = document.getElementById('edit-username-btn');
	const closeUsernameModal = document.getElementById('close-username-modal');
	const cancelUsernameBtn = document.getElementById('cancel-username-btn');
	const saveUsernameBtn = document.getElementById('save-username-btn');
	const newUsernameInput = document.getElementById('new-username-input') as HTMLInputElement | null;
	const usernameHint = document.getElementById('username-hint');
	const usernameAvailability = document.getElementById('username-availability');

	let usernameCheckTimeout: NodeJS.Timeout | null = null;

	const showUsernameModal = () => {
		if (!usernameModal) return;
		usernameModal.classList.remove('hidden');
		usernameModal.classList.add('flex');
		if (newUsernameInput) {
			newUsernameInput.value = '';
			newUsernameInput.focus();
		}
		if (usernameHint) usernameHint.textContent = '';
		if (usernameAvailability) {
			usernameAvailability.classList.add('hidden');
			usernameAvailability.textContent = '';
		}
		if (saveUsernameBtn) saveUsernameBtn.disabled = true;
	};

	const hideUsernameModal = () => {
		if (!usernameModal) return;
		usernameModal.classList.add('hidden');
		usernameModal.classList.remove('flex');
	};

	const checkUsernameAvailability = async (username: string) => {
		if (!usernameAvailability) return;

		if (username.length < 3) {
			usernameAvailability.classList.add('hidden');
			if (saveUsernameBtn) saveUsernameBtn.disabled = true;
			return;
		}

		try {
			const response = await fetch(`https://${host}/userback/users/check-availability?username=${encodeURIComponent(username)}`, {
				credentials: 'include'
			});
			const data = await response.json();

			if (data.success && data.available) {
				usernameAvailability.textContent = '✓ Ce username est disponible';
				usernameAvailability.className = 'pixel-font text-xs mt-2 text-green-400';
				usernameAvailability.classList.remove('hidden');
				if (saveUsernameBtn) saveUsernameBtn.disabled = false;
			} else {
				usernameAvailability.textContent = '✗ Ce username est déjà pris';
				usernameAvailability.className = 'pixel-font text-xs mt-2 text-red-400';
				usernameAvailability.classList.remove('hidden');
				if (saveUsernameBtn) saveUsernameBtn.disabled = true;
			}
		} catch (err) {
			console.error('Error checking username availability:', err);
			usernameAvailability.textContent = '⚠ Erreur de vérification';
			usernameAvailability.className = 'pixel-font text-xs mt-2 text-orange-400';
			usernameAvailability.classList.remove('hidden');
			if (saveUsernameBtn) saveUsernameBtn.disabled = true;
		}
	};

	const handleUsernameInput = () => {
		if (!newUsernameInput || !usernameHint) return;

		const value = newUsernameInput.value.trim();

		if (value.length === 0) {
			usernameHint.textContent = '';
			if (usernameAvailability) usernameAvailability.classList.add('hidden');
			if (saveUsernameBtn) saveUsernameBtn.disabled = true;
			return;
		}

		if (value.length < 3) {
			usernameHint.textContent = `${value.length}/3 caractères minimum`;
			usernameHint.className = 'pixel-font text-xs mt-2 text-orange-400';
			if (saveUsernameBtn) saveUsernameBtn.disabled = true;
		} else if (value.length <= 20) {
			usernameHint.textContent = `${value.length}/20 caractères`;
			usernameHint.className = 'pixel-font text-xs mt-2 text-blue-300/70';

			// Debounce la vérification de disponibilité
			if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
			usernameCheckTimeout = setTimeout(() => {
				void checkUsernameAvailability(value);
			}, 500);
		}
	};

	const handleSaveUsername = async () => {
		if (!newUsernameInput || !saveUsernameBtn) return;

		const newUsername = newUsernameInput.value.trim();
		const currentUsername = getCurrentUsername();

		if (!currentUsername || !newUsername || newUsername.length < 3) {
			return;
		}

		saveUsernameBtn.disabled = true;
		saveUsernameBtn.textContent = 'Sauvegarde...';

		try {
			const response = await fetch(`https://${host}/userback/users/username`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					currentUsername,
					newUsername
				})
			});

			const data = await response.json();

			if (data.success) {
				// Mettre à jour SimpleAuth
				const auth = (window as any).simpleAuth;
				auth?.setUsername?.(newUsername);

				// Recharger le profil
				hideUsernameModal();
				setStatus('Username mis à jour avec succès !', 'info');
				setTimeout(() => {
					void loadProfile(newUsername, true);
				}, 500);
			} else {
				throw new Error(data.error || 'Erreur lors de la mise à jour');
			}
		} catch (err) {
			console.error('Error updating username:', err);
			setStatus(err instanceof Error ? err.message : 'Erreur lors de la mise à jour', 'error');
			saveUsernameBtn.disabled = false;
			saveUsernameBtn.textContent = 'Sauvegarder';
		}
	};

	if (editUsernameBtn) {
		editUsernameBtn.addEventListener('click', showUsernameModal);
		cleanupManager.onCleanup(() => editUsernameBtn.removeEventListener('click', showUsernameModal));
	}

	if (closeUsernameModal) {
		closeUsernameModal.addEventListener('click', hideUsernameModal);
		cleanupManager.onCleanup(() => closeUsernameModal.removeEventListener('click', hideUsernameModal));
	}

	if (cancelUsernameBtn) {
		cancelUsernameBtn.addEventListener('click', hideUsernameModal);
		cleanupManager.onCleanup(() => cancelUsernameBtn.removeEventListener('click', hideUsernameModal));
	}

	if (saveUsernameBtn) {
		saveUsernameBtn.addEventListener('click', () => void handleSaveUsername());
		cleanupManager.onCleanup(() => saveUsernameBtn.removeEventListener('click', () => void handleSaveUsername()));
	}

	if (newUsernameInput) {
		newUsernameInput.addEventListener('input', handleUsernameInput);
		cleanupManager.onCleanup(() => newUsernameInput.removeEventListener('input', handleUsernameInput));
	}

	// ====================
	// AVATAR MODAL LOGIC
	// ====================
	const avatarModal = document.getElementById('avatar-modal');
	const avatarContainer = document.getElementById('avatar-container');
	const closeAvatarModal = document.getElementById('close-avatar-modal');
	const avatarGrid = document.getElementById('avatar-grid');
	const customAvatarUpload = document.getElementById('custom-avatar-upload') as HTMLInputElement | null;
	const triggerUpload = document.getElementById('trigger-upload');

	const availableAvatars = [
		'/sprites/cat.gif',
		'/sprites/dancing-cat.gif',
		'/sprites/spaceship.png',
		'/sprites/satellite.png',
		'/sprites/earth.png',
		'/sprites/blackhole.png'
	];

	const showAvatarModal = () => {
		if (!avatarModal || !avatarGrid) return;

		// Remplir la grille d'avatars
		avatarGrid.innerHTML = availableAvatars.map(src => `
			<button
				class="aspect-square neon-border bg-blue-950/30 hover:bg-blue-900/50 transition-all rounded-lg overflow-hidden p-2 cursor-pointer group"
				data-avatar-src="${src}"
			>
				<img
					src="${src}"
					alt="Avatar"
					class="w-full h-full object-cover rounded group-hover:scale-110 transition-transform"
					style="image-rendering: pixelated;"
				/>
			</button>
		`).join('');

		avatarModal.classList.remove('hidden');
		avatarModal.classList.add('flex');

		// Ajouter les event listeners sur les avatars
		avatarGrid.querySelectorAll('[data-avatar-src]').forEach(btn => {
			btn.addEventListener('click', () => {
				const src = btn.getAttribute('data-avatar-src');
				if (src) void handleSelectAvatar(src);
			});
		});
	};

	const handleCustomAvatarUpload = () => {
		if (!customAvatarUpload) return;

		const file = customAvatarUpload.files?.[0];
		if (!file) return;

		// Vérifier le type de fichier
		if (!file.type.startsWith('image/')) {
			setStatus('Veuillez sélectionner une image valide', 'error');
			return;
		}

		// Vérifier la taille (max 500KB)
		if (file.size > 500000) {
			setStatus('L\'image est trop grande (max 500KB)', 'error');
			return;
		}

		// Lire le fichier et le convertir en base64
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				void handleSelectAvatar(result);
			}
		};
		reader.onerror = () => {
			setStatus('Erreur lors de la lecture de l\'image', 'error');
		};
		reader.readAsDataURL(file);

		// Réinitialiser l'input
		customAvatarUpload.value = '';
	};

	const hideAvatarModal = () => {
		if (!avatarModal) return;
		avatarModal.classList.add('hidden');
		avatarModal.classList.remove('flex');
	};

	const handleSelectAvatar = async (avatarSrc: string) => {
		const currentUsername = getCurrentUsername();
		if (!currentUsername) {
			setStatus('Vous devez être connecté pour changer votre avatar', 'error');
			return;
		}

		try {
			// Mettre à jour l'avatar côté serveur
			const response = await fetch(`https://${host}/userback/users/avatar`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					username: currentUsername,
					avatar: avatarSrc
				})
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Erreur lors de la mise à jour');
			}

			// Mettre à jour le localStorage pour SimpleAuth
			localStorage.setItem('player_avatar', avatarSrc);

			// Mettre à jour l'affichage
			if (profileAvatar) {
				profileAvatar.src = avatarSrc;
			}

			// Mettre à jour tous les éléments avec data-auth-avatar
			document.querySelectorAll<HTMLImageElement>('[data-auth-avatar]').forEach(img => {
				img.src = avatarSrc;
			});

			hideAvatarModal();
			setStatus('Avatar mis à jour avec succès !', 'info');
		} catch (err) {
			console.error('Error updating avatar:', err);
			setStatus(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'avatar', 'error');
		}
	};

	if (avatarContainer) {
		avatarContainer.addEventListener('click', () => {
			// Vérifier si c'est notre propre profil
			const selfUsername = getCurrentUsername();
			if (selfUsername && currentDisplayedUser === selfUsername) {
				showAvatarModal();
			}
		});
		cleanupManager.onCleanup(() => {
			avatarContainer.replaceWith(avatarContainer.cloneNode(true));
		});
	}

	if (closeAvatarModal) {
		closeAvatarModal.addEventListener('click', hideAvatarModal);
		cleanupManager.onCleanup(() => closeAvatarModal.removeEventListener('click', hideAvatarModal));
	}

	if (triggerUpload && customAvatarUpload) {
		triggerUpload.addEventListener('click', () => customAvatarUpload.click());
		cleanupManager.onCleanup(() => {
			if (triggerUpload) triggerUpload.replaceWith(triggerUpload.cloneNode(true));
		});
	}

	if (customAvatarUpload) {
		customAvatarUpload.addEventListener('change', handleCustomAvatarUpload);
		cleanupManager.onCleanup(() => customAvatarUpload.removeEventListener('change', handleCustomAvatarUpload));
	}

	// Cleanup des timeouts
	cleanupManager.onCleanup(() => {
		if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
	});

	if (form) {
		form.addEventListener("submit", handleSubmit);
		cleanupManager.onCleanup(() => form.removeEventListener("submit", handleSubmit));
	}

	if (showSelfBtn) {
		showSelfBtn.addEventListener("click", handleShowSelf);
		cleanupManager.onCleanup(() => showSelfBtn.removeEventListener("click", handleShowSelf));
	}

	if (resetBtn) {
		resetBtn.addEventListener("click", handleReset);
		cleanupManager.onCleanup(() => resetBtn.removeEventListener("click", handleReset));
	}

	// Animations d'entrée
	cleanupManager.registerGsapTarget("#dashboard-title");
	cleanupManager.registerGsapTarget("#stat-cards .neon-border");
	cleanupManager.registerGsapTarget("#main-profile");
	gsap.from("#dashboard-title", { opacity: 0, y: -10, duration: 0.6, ease: "power2.out" });
	gsap.from("#main-profile", { opacity: 0, scale: 0.95, duration: 0.8, ease: "power2.out", delay: 0.2 });
	gsap.from("#stat-cards .neon-border", { opacity: 0, y: 30, duration: 0.8, ease: "power2.out", stagger: 0.1, delay: 0.4 });

	// Charger le profil au démarrage
	const lastUser = localStorage.getItem("pong:last-dashboard-user");
	const selfUsername = getCurrentUsername();

	if (lastUser && input) {
		// Si on a un dernier utilisateur recherché, le charger
		input.value = lastUser;
		void loadProfile(lastUser, false);
	} else if (selfUsername) {
		// Sinon, charger le profil de l'utilisateur connecté
		void loadProfile(selfUsername, true);
	} else {
		// Sinon, afficher un message pour se connecter
		setStatus("Connectez-vous ou recherchez un joueur pour voir son profil", "info");
	}

	return cleanupManager.getCleanupFunction();
};
