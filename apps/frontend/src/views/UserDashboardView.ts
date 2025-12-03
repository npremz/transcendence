import type { ViewFunction } from "../router/types";
import { Layout } from "../components/Layout";
import { gsap } from "gsap";
import { createCleanupManager } from "../utils/CleanupManager";

type UserRecord = {
	id: string;
	username: string;
	created_at: string;
	last_seen?: string;
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
						<div class="relative w-32 h-32 rounded-full overflow-hidden border-2 border-blue-500/60 bg-blue-900/60 shadow-lg">
							<img
								src="/sprites/cat.gif"
								alt="Avatar"
								class="w-full h-full object-cover"
								style="image-rendering: pixelated;"
								id="profile-avatar"
							/>
						</div>
					</div>

					<!-- User info -->
					<div class="flex-1 space-y-4 text-center md:text-left">
						<div>
							<p class="pixel-font text-xs text-blue-300/70 uppercase tracking-[0.25em]" id="profile-label">Profil</p>
							<h2 class="pixel-font text-4xl text-blue-100 mt-2" id="profile-username">—</h2>
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
		if (!user) {
			if (profileLabel) profileLabel.textContent = "Profil";
			if (profileUsername) profileUsername.textContent = "Aucun profil chargé";
			if (profileCreated) profileCreated.textContent = "—";
			if (profileLastSeen) profileLastSeen.textContent = "—";
			return;
		}

		currentDisplayedUser = user.username;
		if (profileLabel) profileLabel.textContent = isSelf ? "Mon profil" : "Profil de " + user.username;
		if (profileUsername) profileUsername.textContent = user.username;
		if (profileCreated) profileCreated.textContent = formatDate(user.created_at);
		if (profileLastSeen) profileLastSeen.textContent = formatDate(user.last_seen);
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
