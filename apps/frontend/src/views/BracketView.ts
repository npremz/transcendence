import type { ViewFunction, CleanupFunction, RouteParams } from "../router/types";
import { gsap } from "gsap";
import { createCleanupManager } from "../utils/CleanupManager";

interface Player {
    id: string;
    username: string;
    avatar?: string;
    currentTournament?: string;
    isEleminated: boolean;
}

interface Match {
    id: string;
    tournamentId: string;
    round: number;
    position: number;
    player1?: Player;
    player2?: Player;
    winner?: Player;
    roomId?: string;
    status: 'pending' | 'ready' | 'in_progress' | 'finished';
    scheduledAt?: Date;
    finishedAt?: Date;
}

interface Tournament {
    id: string;
    name: string;
    status: 'registration' | 'in_progress' | 'finished';
    maxPlayers: number;
    currentPlayers: Player[];
    bracket: Match[];
    currentRound: number;
    winner?: Player;
    createdAt: Date;
    StartedAt?: Date;
    finishedAt?: Date;
}

export const BracketView: ViewFunction = () => {
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

                .match-card.in_progress {
                    border-color: rgba(234, 179, 8, 0.8);
                    animation: matchPulse 2s ease-in-out infinite;
                }

                @keyframes matchPulse {
                    0%, 100% { 
                        box-shadow: 0 0 10px rgba(234, 179, 8, 0.5);
                    }
                    50% { 
                        box-shadow: 0 0 20px rgba(234, 179, 8, 0.8);
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

                /* Tree connections */
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

                /* Lignes de connexion */
                .connector-line {
                    position: absolute;
                    background: rgba(59, 130, 246, 0.4);
                    z-index: 0;
                }

                .connector-horizontal {
                    height: 2px;
                }

                .connector-vertical {
                    width: 2px;
                }

                /* Animation des connexions */
                @keyframes flowRight {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .connector-line.active::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 20px;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent);
                    animation: flowRight 2s ease-in-out infinite;
                }
            </style>
            
            <!-- Scanline effect -->
            <div class="absolute inset-0 pointer-events-none opacity-10">
                <div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
            </div>
        </div>

        <!-- Contenu principal -->
        <div class="relative z-10 min-h-screen flex flex-col">
            <!-- Header avec BackButton -->
            <header class="flex justify-between items-center px-8 py-6">
                <button
                    onclick="window.router.goBack()"
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

            <!-- Container principal -->
            <div class="flex-1 px-4 py-8">
                <!-- Loading state -->
                <div id="tournament-loading" class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent"></div>
                    <p class="pixel-font text-blue-300 mt-4">Loading tournament...</p>
                </div>

                <!-- Content -->
                <div id="tournament-content" style="display: none;">
                    <!-- Header du tournoi -->
                    <div id="tournament-header" class="mb-8"></div>
                    
                    <!-- Brackets en arbre -->
                    <div id="tournament-brackets" class="bracket-tree"></div>
                </div>

                <!-- Error state -->
                <div id="tournament-error" style="display: none;" class="text-center py-12">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="pixel-font text-2xl text-red-400 mb-2">Tournament not found</h3>
                    <p class="pixel-font text-sm text-blue-300/60">Unable to load tournament data</p>
                </div>
            </div>

            <!-- Footer -->
            <footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
                <p>© 2025 PONG - SKILL ISSUE</p>
            </footer>
        </div>
    `;
};

export const bracketLogic = (params: RouteParams | undefined): CleanupFunction => {
    console.log('🎮 BracketView: Initializing...');

    const cleanupManager = createCleanupManager();
    const tournamentId = params?.id;
    const myPlayerId = window.simpleAuth.getPlayerId();

    let pollInterval: number | null = null;
    let isFirstRender = true;
    let displayedMatchIds = new Set<string>();
    let currentTournamentState: Tournament | null = null;

    // Enregistrer les cibles GSAP
    cleanupManager.registerGsapTarget('.neon-border');
    cleanupManager.registerGsapTarget('.round-column');

    const cleanupIntervals = () => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('🧹 Polling interval cleared');
        }
    };

    const fetchTournamentData = async (): Promise<void> => {
        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/tournamentback/tournaments/${tournamentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const tournament = data.tournament;
            
            displayTournament(tournament);
            checkIfMyTurn(tournament);
        } catch (error) {
            console.error('Erreur lors de la récupération du tournoi:', error);
            showError();
        }
    };

    const checkIfMyTurn = (tournament: Tournament): void => {
        const myMatch = tournament.bracket.find(match => 
            match.status === 'in_progress' &&
            (match.player1?.id === myPlayerId || match.player2?.id === myPlayerId)
        );

        if (myMatch && myMatch.roomId) {
            console.log('Mon match est prêt ! Redirection...');
            
            cleanupIntervals();
            
            const host = import.meta.env.VITE_HOST;
            const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
            const wsUrl = `wss://${host}${endpoint}/${myMatch.roomId}`;
            sessionStorage.setItem('gameWsURL', wsUrl);
            
            window.router.navigate(`/game/${myMatch.roomId}`);
        }
    };

    const displayTournament = (tournament: Tournament): void => {
        hideLoading();
        showContent();

        const headerNeedsUpdate = !currentTournamentState || 
            currentTournamentState.status !== tournament.status ||
            currentTournamentState.currentRound !== tournament.currentRound ||
            currentTournamentState.winner?.id !== tournament.winner?.id;

        if (headerNeedsUpdate) {
            updateHeader(tournament);
        }

        updateBrackets(tournament);

        currentTournamentState = tournament;
    };

    const updateHeader = (tournament: Tournament): void => {
        const headerElement = document.getElementById('tournament-header');
        if (headerElement) {
            headerElement.innerHTML = `
                <div class="neon-border bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-6">
                    <div class="text-center">
                        <h2 class="pixel-font text-4xl text-red-500 mb-4" style="animation: neonPulse 2s ease-in-out infinite;">
                            🏆 TOURNAMENT ${tournament.name.toUpperCase()} 🏆
                        </h2>
                        <div class="flex justify-center gap-8 pixel-font text-sm text-blue-300">
                            <span>Status: <span class="text-yellow-400">${getStatusText(tournament.status)}</span></span>
                            <span>Round: <span class="text-green-400">${tournament.currentRound}</span></span>
                            ${tournament.winner ? `<span>Winner: <span class="text-yellow-400">👑 ${tournament.winner.username}</span></span>` : ''}
                        </div>
                    </div>
                </div>
            `;

            if (isFirstRender) {
                gsap.from(headerElement.querySelector('.neon-border'), {
                    scale: 0.9,
                    opacity: 0,
                    duration: 0.8,
                    ease: 'back.out'
                });
            }
        }
    };

    const updateBrackets = (tournament: Tournament): void => {
        const bracketsElement = document.getElementById('tournament-brackets');
        if (!bracketsElement) return;

        if (isFirstRender) {
            bracketsElement.innerHTML = generateTreeBrackets(tournament.bracket);
            tournament.bracket.forEach(match => displayedMatchIds.add(match.id));

            gsap.from('.round-column', {
                x: -50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power2.out'
            });

            cleanupManager.setTimeout(() => drawConnections(tournament.bracket), 1000);

            isFirstRender = false;
        } else {
            const newMatches = tournament.bracket.filter(match => !displayedMatchIds.has(match.id));
            
            if (newMatches.length > 0) {
                newMatches.forEach(match => {
                    displayedMatchIds.add(match.id);
                });
                
                bracketsElement.innerHTML = generateTreeBrackets(tournament.bracket);
                drawConnections(tournament.bracket);
            }

            tournament.bracket.forEach(match => {
                updateMatchElement(match);
            });
        }
    };

    const generateTreeBrackets = (matches: Match[]): string => {
        if (matches.length === 0) {
            return '<div class="text-center p-8 pixel-font text-blue-300/60">No matches available</div>';
        }

        const matchesByRound = matches.reduce((acc, match) => {
            if (!acc[match.round]) {
                acc[match.round] = [];
            }
            acc[match.round].push(match);
            return acc;
        }, {} as Record<number, Match[]>);

        const maxRound = Math.max(...Object.keys(matchesByRound).map(Number));

        let html = '';
        
        for (let round = 1; round <= maxRound; round++) {
            const roundMatches = matchesByRound[round] || [];
            html += generateRoundColumn(round, roundMatches, round === maxRound);
        }
        
        return html;
    };

    const generateRoundColumn = (round: number, matches: Match[], isFinal: boolean): string => {
        const roundTitle = isFinal ? 'FINAL' : `ROUND ${round}`;
        
        return `
            <div class="round-column" data-round="${round}">
                <div class="round-header">
                    <h3 class="pixel-font text-xl text-blue-400">
                        ${roundTitle}
                    </h3>
                </div>
                <div class="matches-container flex flex-col justify-around gap-8 flex-1">
                    ${matches.map(match => generateMatchCard(match)).join('')}
                </div>
            </div>
        `;
    };

    const generateMatchCard = (match: Match): string => {
        const getStatusColor = (status: string): string => {
            switch (status) {
                case 'ready': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
                case 'in_progress': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
                case 'finished': return 'bg-green-500/20 border-green-500/50 text-green-400';
                default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
            }
        };

        const isMyMatch = match.player1?.id === myPlayerId || match.player2?.id === myPlayerId;

        return `
            <div class="match-card neon-border rounded-lg p-4 ${match.status} ${isMyMatch ? 'ring-2 ring-red-500/50' : ''}" 
                 data-match-id="${match.id}"
                 data-round="${match.round}"
                 data-position="${match.position}">
                
                <!-- Header du match -->
                <div class="flex justify-between items-center mb-3">
                    <span class="match-status pixel-font text-xs ${getStatusColor(match.status)} px-2 py-1 rounded border">
                        ${getStatusText(match.status)}
                    </span>
                    ${isMyMatch ? '<span class="pixel-font text-xs text-red-400">← YOU</span>' : ''}
                </div>

                <!-- Players -->
                <div class="space-y-2">
                    <!-- Player 1 -->
                    <div class="player-slot player-1 neon-border p-3 rounded ${match.winner?.id === match.player1?.id ? 'winner' : match.winner ? 'loser' : ''}" 
                         data-player-id="${match.player1?.id || ''}">
                        <div class="flex items-center justify-between gap-2">
                            ${match.player1 ? `
                                <div class="w-8 h-8 rounded-full overflow-hidden border border-blue-500/30 flex-shrink-0">
                                    <img 
                                        src="${match.player1.avatar || '/sprites/cat.gif'}" 
                                        alt="${match.player1.username}" 
                                        class="w-full h-full object-cover"
                                        style="image-rendering: pixelated;"
                                    />
                                </div>
                            ` : ''}
                            <span class="pixel-font text-sm text-blue-300 flex-1">
                                ${match.player1?.username || 'TBD'}
                            </span>
                            ${match.winner?.id === match.player1?.id ? '<span class="text-xl winner-crown">👑</span>' : ''}
                        </div>
                    </div>

                    <!-- VS -->
                    <div class="text-center pixel-font text-xs text-blue-400/40">VS</div>

                    <!-- Player 2 -->
                    <div class="player-slot player-2 neon-border p-3 rounded ${match.winner?.id === match.player2?.id ? 'winner' : match.winner ? 'loser' : ''}" 
                         data-player-id="${match.player2?.id || ''}">
                        <div class="flex items-center justify-between gap-2">
                            ${match.player2 ? `
                                <div class="w-8 h-8 rounded-full overflow-hidden border border-blue-500/30 flex-shrink-0">
                                    <img 
                                        src="${match.player2.avatar || '/sprites/cat.gif'}" 
                                        alt="${match.player2.username}" 
                                        class="w-full h-full object-cover"
                                        style="image-rendering: pixelated;"
                                    />
                                </div>
                            ` : ''}
                            <span class="pixel-font text-sm text-blue-300 flex-1">
                                ${match.player2?.username || 'TBD'}
                            </span>
                            ${match.winner?.id === match.player2?.id ? '<span class="text-xl winner-crown">👑</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const drawConnections = (matches: Match[]): void => {
        document.querySelectorAll('.connector-line').forEach(el => el.remove());

        const matchesByRound = matches.reduce((acc, match) => {
            if (!acc[match.round]) {
                acc[match.round] = [];
            }
            acc[match.round].push(match);
            return acc;
        }, {} as Record<number, Match[]>);

        const maxRound = Math.max(...Object.keys(matchesByRound).map(Number));

        for (let round = 1; round < maxRound; round++) {
            const currentRoundMatches = matchesByRound[round] || [];
            const nextRoundMatches = matchesByRound[round + 1] || [];

            currentRoundMatches.forEach((match, index) => {
                const nextMatchIndex = Math.floor(index / 2);
                const nextMatch = nextRoundMatches[nextMatchIndex];

                if (nextMatch) {
                    const currentCard = document.querySelector(`[data-match-id="${match.id}"]`) as HTMLElement;
                    const nextCard = document.querySelector(`[data-match-id="${nextMatch.id}"]`) as HTMLElement;

                    if (currentCard && nextCard) {
                        const currentRect = currentCard.getBoundingClientRect();
                        const nextRect = nextCard.getBoundingClientRect();
                        const container = document.getElementById('tournament-brackets');
                        
                        if (container) {
                            const containerRect = container.getBoundingClientRect();

                            const horizontalLine = document.createElement('div');
                            horizontalLine.className = 'connector-line connector-horizontal';
                            if (match.status === 'finished') {
                                horizontalLine.classList.add('active');
                            }
                            horizontalLine.style.left = `${currentRect.right - containerRect.left}px`;
                            horizontalLine.style.top = `${currentRect.top + currentRect.height / 2 - containerRect.top}px`;
                            horizontalLine.style.width = '40px';
                            container.appendChild(horizontalLine);

                            const junctionX = currentRect.right - containerRect.left + 40;
                            const junctionY = currentRect.top + currentRect.height / 2 - containerRect.top;
                            const nextJunctionY = nextRect.top + nextRect.height / 2 - containerRect.top;

                            if (index % 2 === 1) {
                                const verticalLine = document.createElement('div');
                                verticalLine.className = 'connector-line connector-vertical';
                                const prevMatch = currentRoundMatches[index - 1];
                                const prevCard = document.querySelector(`[data-match-id="${prevMatch.id}"]`) as HTMLElement;
                                
                                if (prevCard) {
                                    const prevRect = prevCard.getBoundingClientRect();
                                    const prevY = prevRect.top + prevRect.height / 2 - containerRect.top;
                                    
                                    verticalLine.style.left = `${junctionX}px`;
                                    verticalLine.style.top = `${Math.min(prevY, junctionY)}px`;
                                    verticalLine.style.height = `${Math.abs(junctionY - prevY)}px`;
                                    container.appendChild(verticalLine);
                                }

                                const finalHorizontal = document.createElement('div');
                                finalHorizontal.className = 'connector-line connector-horizontal';
                                finalHorizontal.style.left = `${junctionX}px`;
                                finalHorizontal.style.top = `${nextJunctionY}px`;
                                finalHorizontal.style.width = `${nextRect.left - containerRect.left - junctionX}px`;
                                container.appendChild(finalHorizontal);
                            }
                        }
                    }
                }
            });
        }
    };

    const updateMatchElement = (match: Match): void => {
        const matchElement = document.querySelector(`[data-match-id="${match.id}"]`);
        if (!matchElement) return;

        const statusEl = matchElement.querySelector('.match-status');
        if (statusEl) {
            const newStatus = getStatusText(match.status);
            if (statusEl.textContent !== newStatus) {
                statusEl.textContent = newStatus;
                
                const getStatusColor = (status: string): string => {
                    switch (status) {
                        case 'ready': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
                        case 'in_progress': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
                        case 'finished': return 'bg-green-500/20 border-green-500/50 text-green-400';
                        default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
                    }
                };
                
                statusEl.className = `match-status pixel-font text-xs px-2 py-1 rounded border ${getStatusColor(match.status)}`;
                
                matchElement.className = `match-card neon-border rounded-lg p-4 ${match.status} ${
                    match.player1?.id === myPlayerId || match.player2?.id === myPlayerId ? 'ring-2 ring-red-500/50' : ''
                }`;
            }
        }

        if (match.winner) {
            const player1Slot = matchElement.querySelector('.player-1');
            const player2Slot = matchElement.querySelector('.player-2');

            if (player1Slot && player2Slot) {
                const isPlayer1Winner = match.winner.id === match.player1?.id;
                const isPlayer2Winner = match.winner.id === match.player2?.id;

                const p1Classes = `player-slot player-1 neon-border p-3 rounded ${isPlayer1Winner ? 'winner' : 'loser'}`;
                if (player1Slot.className !== p1Classes) {
                    player1Slot.className = p1Classes;
                    if (isPlayer1Winner && !player1Slot.querySelector('.winner-crown')) {
                        const crownEl = document.createElement('span');
                        crownEl.className = 'text-xl winner-crown';
                        crownEl.textContent = '👑';
                        player1Slot.querySelector('div')?.appendChild(crownEl);
                    }
                }

                const p2Classes = `player-slot player-2 neon-border p-3 rounded ${isPlayer2Winner ? 'winner' : 'loser'}`;
                if (player2Slot.className !== p2Classes) {
                    player2Slot.className = p2Classes;
                    if (isPlayer2Winner && !player2Slot.querySelector('.winner-crown')) {
                        const crownEl = document.createElement('span');
                        crownEl.className = 'text-xl winner-crown';
                        crownEl.textContent = '👑';
                        player2Slot.querySelector('div')?.appendChild(crownEl);
                    }
                }
            }
        }
    };

    const getStatusText = (status: string): string => {
        switch (status) {
            case 'registration': return 'REGISTRATION';
            case 'in_progress': return 'IN PROGRESS';
            case 'finished': return 'FINISHED';
            case 'ready': return 'READY';
            case 'pending': return 'PENDING';
            default: return status.toUpperCase();
        }
    };

    const hideLoading = (): void => {
        const loading = document.getElementById('tournament-loading');
        if (loading) loading.style.display = 'none';
    };

    const showContent = (): void => {
        const content = document.getElementById('tournament-content');
        if (content) content.style.display = 'block';
    };

    const showError = (): void => {
        hideLoading();
        const error = document.getElementById('tournament-error');
        if (error) error.style.display = 'block';
    };

    fetchTournamentData();

    pollInterval = cleanupManager.setInterval(() => {
        fetchTournamentData();
        if (currentTournamentState) {
            cleanupManager.setTimeout(() => drawConnections(currentTournamentState!.bracket), 100);
        }
    }, 2000);
    console.log('🔄 Started bracket polling');

    // Enregistrer le cleanup du polling
    cleanupManager.onCleanup(() => {
        cleanupIntervals();
    });

    return cleanupManager.getCleanupFunction();
};
