import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { LocalTournamentManager, type LocalTournament, type LocalMatch } from "../utils/localTournamentManager";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

export const LocalTournamentBracketView: ViewFunction = () => {
	const content = `
			<style>
				.match-card {
					transition: all 0.3s ease;
					background: rgba(15, 23, 42, 0.8);
					backdrop-filter: blur(10px);
					position: relative;
					min-width: 200px;
				}

				.match-card.finished {
					border-color: rgba(34, 197, 94, 0.8);
				}

				.match-card.ready {
					border-color: rgba(234, 179, 8, 0.8);
					animation: matchPulse 2s ease-in-out infinite;
				}

				.match-card.in_progress {
					border-color: rgba(239, 68, 68, 0.8);
					animation: matchPulse 2s ease-in-out infinite;
				}

				@keyframes matchPulse {
					0%, 100% {
						box-shadow: 0 0 10px currentColor;
					}
					50% {
						box-shadow: 0 0 20px currentColor;
					}
				}

				.player-slot {
					transition: all 0.2s ease;
				}

				.player-slot.winner {
					background: rgba(34, 197, 94, 0.2);
					border-color: rgba(34, 197, 94, 0.5);
				}

				.player-slot.loser {
					opacity: 0.5;
				}

				.bracket-tree {
					display: flex;
					gap: 80px;
					padding: 40px;
					overflow-x: auto;
					min-height: 600px;
				}

				.round-column {
					display: flex;
					flex-direction: column;
					justify-content: space-around;
					min-width: 220px;
					position: relative;
				}

				.round-header {
					text-align: center;
					margin-bottom: 20px;
					position: sticky;
					top: 0;
					background: rgba(4, 7, 26, 0.9);
					padding: 10px;
					border-radius: 8px;
					z-index: 10;
				}

				.winner-modal {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.9);
					display: flex;
					align-items: center;
					justify-content: center;
					z-index: 1000;
				}

				.winner-modal.hidden {
					display: none;
				}
			</style>

			<header class="flex justify-between items-center px-8 py-6">
				<button
					id="exit-tournament-btn"
					class="pixel-font px-6 py-3 neon-border bg-transparent text-red-400 hover:bg-red-500/10 transition-all"
				>
					EXIT TOURNAMENT
				</button>

				<div class="pixel-font text-blue-400 text-sm">
					<span id="tournament-status">Round 1</span>
				</div>
			</header>

			<div class="flex-1 overflow-y-auto">
				<!-- Titre -->
				<div class="text-center py-6">
					<h1 class="pixel-font text-4xl md:text-5xl text-blue-400"
						style="animation: neonPulse 2s ease-in-out infinite;">
						🏆 TOURNAMENT BRACKET 🏆
					</h1>
				</div>

				<!-- Bracket Tree -->
				<div id="bracket-container" class="bracket-tree">
					<!-- Rounds will be generated here -->
				</div>

				<!-- Next Match Panel -->
				<div id="next-match-panel" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 hidden">
					<div class="neon-border rounded-lg p-6 bg-black/90 backdrop-blur-lg">
						<div class="pixel-font text-center">
							<div class="text-blue-400 text-sm mb-2">NEXT MATCH</div>
							<div class="text-white text-lg mb-4" id="next-match-text">
								Player 1 vs Player 2
							</div>
							<button
								id="play-match-btn"
								class="pixel-font px-8 py-3 neon-border bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-all"
							>
								PLAY MATCH
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Winner Modal -->
		<div id="winner-modal" class="winner-modal hidden">
			<div class="neon-border rounded-lg p-12 bg-black/90 backdrop-blur-lg text-center">
				<div class="pixel-font text-6xl text-yellow-400 mb-6" style="animation: neonPulse 2s ease-in-out infinite;">
					🏆 CHAMPION 🏆
				</div>
				<div class="pixel-font text-4xl text-blue-400 mb-8" id="winner-name">
					Player Name
				</div>
				<div class="flex gap-4 justify-center">
					<button
						id="new-tournament-btn"
						class="pixel-font px-8 py-3 neon-border bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-all"
					>
						NEW TOURNAMENT
					</button>
					<button
						id="exit-to-menu-btn"
						class="pixel-font px-8 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
					>
						MAIN MENU
					</button>
				</div>
			</div>
	`;

	return Layout.render(content, {
		showBackButton: true,
		showFooter: false
	});
};

const generateMatchCard = (match: LocalMatch): string => {
	const statusClass = match.status;
	const isFinished = match.status === 'finished';

	const player1Class = isFinished
		? (match.winner?.id === match.player1?.id ? 'winner' : 'loser')
		: '';
	const player2Class = isFinished
		? (match.winner?.id === match.player2?.id ? 'winner' : 'loser')
		: '';

	return `
		<div class="match-card neon-border rounded-lg p-4 mb-4 ${statusClass}" data-match-id="${match.id}">
			<div class="space-y-2">
				<!-- Player 1 -->
				<div class="player-slot neon-border rounded p-2 ${player1Class}">
					<div class="pixel-font text-sm text-blue-300">
						${match.player1?.username || 'TBD'}
						${isFinished && match.winner?.id === match.player1?.id ? ' 👑' : ''}
					</div>
				</div>

				<div class="text-center pixel-font text-xs text-blue-400">VS</div>

				<!-- Player 2 -->
				<div class="player-slot neon-border rounded p-2 ${player2Class}">
					<div class="pixel-font text-sm text-blue-300">
						${match.player2?.username || 'TBD'}
						${isFinished && match.winner?.id === match.player2?.id ? ' 👑' : ''}
					</div>
				</div>
			</div>

			${match.status === 'ready' ? `
				<div class="text-center mt-3">
					<div class="pixel-font text-xs text-yellow-400">READY TO PLAY</div>
				</div>
			` : ''}

			${match.status === 'in_progress' ? `
				<div class="text-center mt-3">
					<div class="pixel-font text-xs text-red-400">IN PROGRESS...</div>
				</div>
			` : ''}
		</div>
	`;
};

const generateRoundColumn = (tournament: LocalTournament, round: number): string => {
	const matches = LocalTournamentManager.getMatchesForRound(tournament, round);
	const totalRounds = LocalTournamentManager.getTotalRounds(tournament.size);
	const roundName = LocalTournamentManager.getRoundName(round, totalRounds);

	const matchesHtml = matches.map(match => generateMatchCard(match)).join('');

	return `
		<div class="round-column">
			<div class="round-header">
				<div class="pixel-font text-lg text-blue-400">${roundName}</div>
				<div class="pixel-font text-xs text-blue-300">Round ${round}</div>
			</div>
			<div class="matches-container">
				${matchesHtml}
			</div>
		</div>
	`;
};

const renderBracket = (tournament: LocalTournament): void => {
	const container = document.getElementById('bracket-container');
	if (!container) return;

	const totalRounds = LocalTournamentManager.getTotalRounds(tournament.size);
	let html = '';

	for (let round = 1; round <= totalRounds; round++) {
		const matches = LocalTournamentManager.getMatchesForRound(tournament, round);
		if (matches.length > 0) {
			html += generateRoundColumn(tournament, round);
		}
	}

	container.innerHTML = html;

	// Animer l'apparition
	gsap.fromTo(
		'.round-column',
		{ opacity: 0, x: -50 },
		{ opacity: 1, x: 0, duration: 0.5, stagger: 0.2 }
	);
};

const updateNextMatchPanel = (tournament: LocalTournament): void => {
	const panel = document.getElementById('next-match-panel');
	const textEl = document.getElementById('next-match-text');

	if (!panel || !textEl) return;

	const nextMatch = LocalTournamentManager.getNextMatch(tournament);

	if (nextMatch && nextMatch.player1 && nextMatch.player2) {
		textEl.textContent = `${nextMatch.player1.username} vs ${nextMatch.player2.username}`;
		panel.classList.remove('hidden');

		// Animer l'apparition
		gsap.fromTo(
			panel,
			{ y: 100, opacity: 0 },
			{ y: 0, opacity: 1, duration: 0.5 }
		);
	} else {
		panel.classList.add('hidden');
	}
};

const updateTournamentStatus = (tournament: LocalTournament): void => {
	const statusEl = document.getElementById('tournament-status');
	if (!statusEl) return;

	const totalRounds = LocalTournamentManager.getTotalRounds(tournament.size);
	const roundName = LocalTournamentManager.getRoundName(tournament.currentRound, totalRounds);

	statusEl.textContent = `${roundName} (Round ${tournament.currentRound}/${totalRounds})`;
};

const showWinnerModal = (winner: { username: string }): void => {
	const modal = document.getElementById('winner-modal');
	const nameEl = document.getElementById('winner-name');

	if (!modal || !nameEl) return;

	nameEl.textContent = winner.username;
	modal.classList.remove('hidden');

	// Animer l'apparition
	gsap.fromTo(
		modal,
		{ opacity: 0, scale: 0.8 },
		{ opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
	);
};

export const localTournamentBracketLogic = (): CleanupFunction => {
	const cleanupManager = createCleanupManager();
	const tournament = LocalTournamentManager.getCurrentTournament();

	if (!tournament) {
		console.error('No tournament found');
		window.router.navigate('/local-tournament-setup');
		return () => {};
	}

	// Enregistrer les cibles GSAP
	cleanupManager.registerGsapTarget('.round-column');
	cleanupManager.registerGsapTarget('#next-match-panel');
	cleanupManager.registerGsapTarget('#winner-modal');

	// Rendu initial
	renderBracket(tournament);
	updateNextMatchPanel(tournament);
	updateTournamentStatus(tournament);

	// Vérifier si le tournoi est terminé
	if (tournament.status === 'finished' && tournament.winner) {
		showWinnerModal(tournament.winner);
	}

	// Handler pour jouer le prochain match
	const playMatchBtn = document.getElementById('play-match-btn');
	const handlePlayMatch = () => {
		const nextMatch = LocalTournamentManager.getNextMatch(tournament);
		if (!nextMatch || !nextMatch.player1 || !nextMatch.player2) return;

		// Marquer le match comme en cours
		LocalTournamentManager.markMatchInProgress(nextMatch.id);

		// Créer la config pour le mode local
		const roomId = `local-tournament-${Date.now()}`;
		const localGameConfig = {
			roomId,
			left: {
				id: nextMatch.player1.id,
				username: nextMatch.player1.username,
				selectedSkill: nextMatch.player1.selectedSkill,
			},
			right: {
				id: nextMatch.player2.id,
				username: nextMatch.player2.username,
				selectedSkill: nextMatch.player2.selectedSkill,
			},
		};

		// Stocker les infos du match de tournoi
		sessionStorage.setItem('localGameConfig', JSON.stringify(localGameConfig));
		sessionStorage.setItem('localTournamentMatch', nextMatch.id);
		sessionStorage.setItem('gameWsURL', `wss://${window.location.hostname}:8443/gameback/game/${roomId}`);

		// Créer la config pour le backend (qui attend player1/player2)
		const backendConfig = {
			roomId,
			player1: localGameConfig.left,
			player2: localGameConfig.right,
		};

		// Créer la partie sur le backend
		fetch(`https://${window.location.hostname}:8443/gameback/create`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(backendConfig),
		})
			.then(response => {
				if (!response.ok) throw new Error('Failed to create game');
				return response.json();
			})
			.then(() => {
				// Rediriger vers le jeu
				window.router.navigate(`/game/${roomId}`);
			})
			.catch(error => {
				console.error('Error creating game:', error);
				alert('Failed to create game. Please try again.');
			});
	};

	playMatchBtn?.addEventListener('click', handlePlayMatch);

	// Handler pour quitter le tournoi
	const exitBtn = document.getElementById('exit-tournament-btn');
	const handleExit = () => {
		if (confirm('Are you sure you want to exit the tournament? All progress will be lost.')) {
			LocalTournamentManager.clearTournament();
			window.router.navigate('/play');
		}
	};

	exitBtn?.addEventListener('click', handleExit);

	// Handlers pour le modal de victoire
	const newTournamentBtn = document.getElementById('new-tournament-btn');
	const exitToMenuBtn = document.getElementById('exit-to-menu-btn');

	const handleNewTournament = () => {
		LocalTournamentManager.clearTournament();
		window.router.navigate('/local-tournament-setup');
	};

	const handleExitToMenu = () => {
		LocalTournamentManager.clearTournament();
		window.router.navigate('/play');
	};

	newTournamentBtn?.addEventListener('click', handleNewTournament);
	exitToMenuBtn?.addEventListener('click', handleExitToMenu);

	// Enregistrer le cleanup
	cleanupManager.onCleanup(() => {
		playMatchBtn?.removeEventListener('click', handlePlayMatch);
		exitBtn?.removeEventListener('click', handleExit);
		newTournamentBtn?.removeEventListener('click', handleNewTournament);
		exitToMenuBtn?.removeEventListener('click', handleExitToMenu);
	});

	return cleanupManager.getCleanupFunction();
};
