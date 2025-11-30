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
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="pixel-font text-xs text-blue-300/70 tracking-[0.2em] mb-1">PLAYER INSIGHT</p>
					<h1 class="pixel-font text-4xl md:text-5xl text-blue-400" id="dashboard-title" style="animation: neonPulse 2s ease-in-out infinite;">
						USER DASHBOARD
					</h1>
					<p class="pixel-font text-sm text-blue-300/70 mt-2">
						Visualisez un joueur, ses stats et ses dernières parties.
					</p>
				</div>
				<div class="hidden md:flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-300 text-xl">
						👾
					</div>
					<div>
						<p class="pixel-font text-xs text-blue-300/60">MODE</p>
						<p class="pixel-font text-sm text-blue-200">ANALYTICS</p>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
				<!-- Bloc recherche + profil -->
				<div class="neon-border bg-black/50 backdrop-blur-sm rounded-xl p-6 space-y-6">
					<div class="flex items-center justify-between gap-3 flex-wrap">
						<div>
							<p class="pixel-font text-[11px] text-blue-300/70 uppercase tracking-[0.25em]">Rechercher</p>
							<h2 class="pixel-font text-2xl text-blue-300">Utilisateur</h2>
						</div>
						<button
							type="button"
							class="pixel-font text-xs px-4 py-2 neon-border bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 transition-all"
							id="reset-dashboard"
						>
							Clear
						</button>
					</div>

					<form id="user-search-form" class="flex flex-col md:flex-row gap-3">
						<input
							type="text"
							id="user-search-input"
							class="flex-1 pixel-font text-sm px-4 py-3 rounded neon-input"
							placeholder="Ex: player1"
							autocomplete="off"
						/>
						<button
							type="submit"
							class="pixel-font text-sm px-6 py-3 neon-border bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 transition-all"
							id="user-search-btn"
						>
							>>> CHARGER <<<
						</button>
					</form>

					<div id="dashboard-status" class="pixel-font text-sm text-blue-300/80"></div>

					<div id="user-meta" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30 flex items-center justify-center">
							<div class="w-24 h-24 rounded-full overflow-hidden border border-blue-500/50 bg-blue-900/50 shadow-lg">
								<img
									src="/sprites/cat.gif"
									alt="Avatar par défaut"
									class="w-full h-full object-cover"
									style="image-rendering: pixelated;"
								/>
							</div>
						</div>
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
							<p class="pixel-font text-[11px] text-blue-300/70">USERNAME</p>
							<p class="pixel-font text-lg text-blue-100 mt-1" data-meta-username>—</p>
						</div>
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
							<p class="pixel-font text-[11px] text-blue-300/70">INSCRIT</p>
							<p class="pixel-font text-lg text-blue-100 mt-1" data-meta-created>—</p>
						</div>
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
							<p class="pixel-font text-[11px] text-blue-300/70">DERNIER PASSAGE</p>
							<p class="pixel-font text-lg text-blue-100 mt-1" data-meta-last-seen>—</p>
						</div>
					</div>
				</div>

				<!-- Bloc profil personnel -->
				<div class="neon-border bg-gradient-to-br from-blue-900/40 via-black/60 to-black rounded-xl p-6 space-y-4">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="pixel-font text-[11px] text-blue-300/70 uppercase tracking-[0.25em]">Mon profil</p>
							<h3 class="pixel-font text-xl text-blue-200">Stats personnelles</h3>
						</div>
						<button
							type="button"
							class="relative w-12 h-12 rounded-full overflow-hidden border border-blue-500/60 bg-blue-900/60 shadow-lg hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-400"
							data-avatar-change
							title="Changer ma photo"
						>
							<img 
								src="/sprites/cat.gif"
								alt="Avatar"
								class="w-full h-full object-cover"
								style="image-rendering: pixelated;"
								data-auth-avatar
							/>
							<span class="absolute inset-0 flex items-center justify-center text-[10px] text-blue-200 bg-black/40 opacity-0 hover:opacity-100 transition-opacity pixel-font">
								EDIT
							</span>
						</button>
					</div>

					<div id="self-status" class="pixel-font text-sm text-blue-300/80"></div>

					<div class="grid grid-cols-1 gap-3">
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
							<p class="pixel-font text-[11px] text-blue-300/70">USERNAME</p>
							<p class="pixel-font text-lg text-blue-100 mt-1" data-self-username>Anon</p>
						</div>
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
							<p class="pixel-font text-[11px] text-blue-300/70">INSCRIT</p>
							<p class="pixel-font text-lg text-blue-100 mt-1" data-self-created>—</p>
						</div>
						<div class="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30">
							<p class="pixel-font text-[11px] text-blue-300/70">DERNIER PASSAGE</p>
							<p class="pixel-font text-lg text-blue-100 mt-1" data-self-last-seen>—</p>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div class="p-4 rounded-xl neon-border bg-blue-950/20">
							<p class="pixel-font text-[11px] text-blue-300/70 uppercase tracking-[0.25em]">Parties</p>
							<p class="pixel-font text-3xl text-blue-100 mt-2" data-self-total>—</p>
							<p class="pixel-font text-xs text-blue-300/70 mt-1">Total jouées</p>
						</div>
						<div class="p-4 rounded-xl neon-border bg-blue-950/20">
							<p class="pixel-font text-[11px] text-green-300/70 uppercase tracking-[0.25em]">Winrate</p>
							<p class="pixel-font text-3xl text-green-300 mt-2" data-self-winrate>—</p>
							<p class="pixel-font text-xs text-green-200/70 mt-1">Victoires / défaites</p>
							<p class="pixel-font text-xs text-green-200/70 mt-1" data-self-wins>—</p>
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
	const userMeta = document.getElementById("user-meta");
	const metaUsername = document.querySelector("[data-meta-username]");
	const metaCreated = document.querySelector("[data-meta-created]");
	const metaLastSeen = document.querySelector("[data-meta-last-seen]");
	const statTotal = document.querySelector("[data-stat-total]");
	const statWins = document.querySelector("[data-stat-wins]");
	const statWinrate = document.querySelector("[data-stat-winrate]");
	const recentGamesContainer = document.getElementById("recent-games");
	const recentCount = document.getElementById("recent-count");
	const selfStatus = document.getElementById("self-status");
	const selfUsernameEl = document.querySelector("[data-self-username]");
	const selfCreatedEl = document.querySelector("[data-self-created]");
	const selfLastSeenEl = document.querySelector("[data-self-last-seen]");
	const selfTotalEl = document.querySelector("[data-self-total]");
	const selfWinrateEl = document.querySelector("[data-self-winrate]");
	const selfWinsEl = document.querySelector("[data-self-wins]");

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

	const renderUserMeta = (user: UserRecord | null) => {
		if (!userMeta) return;
		if (!user) {
			userMeta.classList.add("hidden");
			return;
		}
		if (metaUsername) metaUsername.textContent = user.username;
		if (metaCreated) metaCreated.textContent = formatDate(user.created_at);
		if (metaLastSeen) metaLastSeen.textContent = formatDate(user.last_seen);
		userMeta.classList.remove("hidden");
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

	const renderSelfMeta = (user: UserRecord | null) => {
		if (!selfUsernameEl || !selfCreatedEl || !selfLastSeenEl) return;
		if (!user) {
			selfUsernameEl.textContent = 'Anon';
			selfCreatedEl.textContent = '—';
			selfLastSeenEl.textContent = '—';
			return;
		}
		selfUsernameEl.textContent = user.username;
		selfCreatedEl.textContent = formatDate(user.created_at);
		selfLastSeenEl.textContent = formatDate(user.last_seen);
	};

	const renderSelfStats = (games: GameHistory[], username: string) => {
		const total = games.length;
		const wins = games.filter(g => g.winner_username === username).length;
		const losses = total - wins;
		const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;

		if (selfTotalEl) selfTotalEl.textContent = total ? String(total) : "0";
		if (selfWinrateEl) selfWinrateEl.textContent = `${winrate}%`;
		if (selfWinsEl) selfWinsEl.textContent = `${wins} / ${losses}`;
	};

	const loadDashboard = async (username: string) => {
		if (!username) {
			setStatus("Merci de saisir un username.", "error");
			return;
		}

		setStatus("Chargement en cours...");
		renderUserMeta(null);
		renderStats([], username);
		renderRecentGames([], username);

		try {
			const [userRes, historyRes] = await Promise.all([
				fetch(`https://${host}/userback/users?username=${encodeURIComponent(username)}`),
				fetch(`https://${host}/gamedb/games/history`)
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

			renderUserMeta(userData.user as UserRecord);
			renderStats(games, username);
			renderRecentGames(games, username);
			setStatus(`Profil chargé pour ${username}`);
			localStorage.setItem("pong:last-dashboard-user", username);
		} catch (err) {
			console.error(err);
			setStatus(err instanceof Error ? err.message : "Erreur inattendue", "error");
		}
	};

	const loadSelfProfile = async () => {
		const auth = (window as any).simpleAuth;
		const username = auth?.getUsername?.() || 'Anon';
		const loggedIn = auth?.isLoggedIn?.() ?? false;

		if (!loggedIn || !username || username === 'Anon') {
			if (selfStatus) selfStatus.textContent = "Connecte-toi pour voir tes stats.";
			renderSelfMeta(null);
			renderSelfStats([], "");
			return;
		}

		if (selfStatus) selfStatus.textContent = "Chargement de ton profil...";

		try {
			const [userRes, historyRes] = await Promise.all([
				fetch(`https://${host}/userback/users?username=${encodeURIComponent(username)}`),
				fetch(`https://${host}/gamedb/games/history`)
			]);

			const userData = await userRes.json().catch(() => ({}));
			const historyData = await historyRes.json().catch(() => ({}));

			if (!userRes.ok || !userData?.success) {
				throw new Error(userData?.error || "Utilisateur introuvable");
			}
			if (!historyRes.ok || !historyData?.success) {
				throw new Error(historyData?.error || "Impossible de charger l'historique");
			}

			const games: GameHistory[] = (historyData.games || []).filter(
				(g: GameHistory) =>
					g.player_left_username === username ||
					g.player_right_username === username ||
					g.winner_username === username
			);

			renderSelfMeta(userData.user as UserRecord);
			renderSelfStats(games, username);
			if (selfStatus) selfStatus.textContent = "Profil personnel chargé.";
		} catch (err) {
			console.error(err);
			if (selfStatus) selfStatus.textContent = err instanceof Error ? err.message : "Erreur inattendue";
			renderSelfMeta(null);
			renderSelfStats([], "");
		}
	};

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		const username = input?.value.trim() || "";
		void loadDashboard(username);
	};

	const handleReset = () => {
		if (input) input.value = "";
		renderUserMeta(null);
		renderStats([], "");
		renderRecentGames([], "");
		clearStatus();
		localStorage.removeItem("pong:last-dashboard-user");
	};

	if (form) {
		form.addEventListener("submit", handleSubmit);
		cleanupManager.onCleanup(() => form.removeEventListener("submit", handleSubmit));
	}

	if (resetBtn) {
		resetBtn.addEventListener("click", handleReset);
		cleanupManager.onCleanup(() => resetBtn.removeEventListener("click", handleReset));
	}

	// Animations d'entrée
	cleanupManager.registerGsapTarget("#dashboard-title");
	cleanupManager.registerGsapTarget("#stat-cards .neon-border");
	gsap.from("#dashboard-title", { opacity: 0, y: -10, duration: 0.6, ease: "power2.out" });
	gsap.from("#stat-cards .neon-border", { opacity: 0, y: 30, duration: 0.8, ease: "power2.out", stagger: 0.1, delay: 0.2 });

	// Recharger le dernier utilisateur consulté si disponible
	const lastUser = localStorage.getItem("pong:last-dashboard-user");
	if (lastUser && input) {
		input.value = lastUser;
		void loadDashboard(lastUser);
	}

	// Charger le profil personnel si connecté
	void loadSelfProfile();

	return cleanupManager.getCleanupFunction();
};
