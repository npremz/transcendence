import type { ViewFunction, CleanupFunction, RouteParams } from "../router/types";
import { gsap } from "gsap";

interface Player {
    id: string;
    username: string;
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
                
                .match-card {
                    transition: all 0.3s ease;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(10px);
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

            <!-- Container principal -->
            <div class="flex-1 container mx-auto px-4 py-8">
                <!-- Loading state -->
                <div id="tournament-loading" class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent"></div>
                    <p class="pixel-font text-blue-300 mt-4">Loading tournament...</p>
                </div>

                <!-- Content -->
                <div id="tournament-content" style="display: none;">
                    <!-- Header du tournoi -->
                    <div id="tournament-header" class="mb-8"></div>
                    
                    <!-- Brackets -->
                    <div id="tournament-brackets"></div>
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

    const tournamentId = params?.id;
    const myPlayerId = window.simpleAuth.getPlayerId();

    let pollInterval: number | null = null;
    let isFirstRender = true;
    let displayedMatchIds = new Set<string>();
    let currentTournamentState: Tournament | null = null;

    // ✅ Fonction de cleanup des intervals
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
            
            cleanupIntervals(); // ✅ Nettoyer avant redirect
            
            const host = import.meta.env.VITE_HOST;
            const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
            const wsUrl = `wss://${host}${endpoint}/${myMatch.roomId}`;
            sessionStorage.setItem('gameWsURL', wsUrl);
            
            window.location.href = `/game/${myMatch.roomId}`;
        }
    };

    const displayTournament = (tournament: Tournament): void => {
        hideLoading();
        showContent();

        // Update header only if tournament state changed
        const headerNeedsUpdate = !currentTournamentState || 
            currentTournamentState.status !== tournament.status ||
            currentTournamentState.currentRound !== tournament.currentRound ||
            currentTournamentState.winner?.id !== tournament.winner?.id;

        if (headerNeedsUpdate) {
            updateHeader(tournament);
        }

        // Update brackets with diff detection
        updateBrackets(tournament);

        currentTournamentState = tournament;
    };

    const updateHeader = (tournament: Tournament): void => {
        const headerElement = document.getElementById('tournament-header');
        if (headerElement) {
            headerElement.innerHTML = `
                <div class="neon-border bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-6">
                    <div class="text-center">
                        <h2 class="pixel-font text-4xl text-pink-500 mb-4" style="animation: neonPulse 2s ease-in-out infinite;">
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

            // Animation du header seulement au premier render
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
            // Premier rendu : tout afficher avec animation
            bracketsElement.innerHTML = generateBracketsHTML(tournament.bracket);
            tournament.bracket.forEach(match => displayedMatchIds.add(match.id));

            gsap.from('.round', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power2.out'
            });

            isFirstRender = false;
        } else {
            // Updates suivants : détecter les nouveaux matches et les changements
            const newMatches = tournament.bracket.filter(match => !displayedMatchIds.has(match.id));
            
            if (newMatches.length > 0) {
                // Ajouter les nouveaux matches
                newMatches.forEach(match => {
                    displayedMatchIds.add(match.id);
                    const roundElement = bracketsElement.querySelector(`[data-round="${match.round}"]`);
                    
                    if (roundElement) {
                        // Round existe déjà, ajouter le match
                        const matchesGrid = roundElement.querySelector('.matches-grid');
                        if (matchesGrid) {
                            const matchDiv = document.createElement('div');
                            matchDiv.innerHTML = generateMatchHTML(match);
                            matchDiv.classList.add('new-match');
                            matchesGrid.appendChild(matchDiv.firstElementChild as HTMLElement);
                        }
                    } else {
                        // Nouveau round
                        const newRoundHTML = generateRoundHTML(match.round, [match]);
                        bracketsElement.insertAdjacentHTML('beforeend', newRoundHTML);
                    }
                });

                // Animer uniquement les nouveaux matches
                gsap.from('.new-match', {
                    y: 30,
                    opacity: 0,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        document.querySelectorAll('.new-match').forEach(el => {
                            el.classList.remove('new-match');
                        });
                    }
                });
            }

            // Mettre à jour les matches existants (status, winner, etc.)
            tournament.bracket.forEach(match => {
                updateMatchElement(match);
            });
        }
    };

    const generateBracketsHTML = (matches: Match[]): string => {
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

        let html = '<div class="space-y-8">';
        
        Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
            const roundMatches = matchesByRound[parseInt(round)];
            html += generateRoundHTML(parseInt(round), roundMatches);
        });
        
        html += '</div>';
        return html;
    };

    const generateRoundHTML = (round: number, matches: Match[]): string => {
        return `
            <div class="round" data-round="${round}">
                <h3 class="pixel-font text-2xl text-blue-400 mb-4 text-center">
                    >>> ROUND ${round} <<<
                </h3>
                <div class="matches-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${matches.map(match => generateMatchHTML(match)).join('')}
                </div>
            </div>
        `;
    };

    const generateMatchHTML = (match: Match): string => {
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
            <div class="match-card neon-border rounded-lg p-4 ${match.status} ${isMyMatch ? 'ring-2 ring-pink-500/50' : ''}" data-match-id="${match.id}">
                <!-- Header du match -->
                <div class="flex justify-between items-center mb-3">
                    <span class="match-status pixel-font text-xs ${getStatusColor(match.status)} px-2 py-1 rounded border">
                        ${getStatusText(match.status)}
                    </span>
                    ${isMyMatch ? '<span class="pixel-font text-xs text-pink-400">← YOU</span>' : ''}
                </div>

                <!-- Players -->
                <div class="space-y-2">
                    <!-- Player 1 -->
                    <div class="player-slot player-1 neon-border p-3 rounded ${match.winner?.id === match.player1?.id ? 'winner' : match.winner ? 'loser' : ''}" data-player-id="${match.player1?.id || ''}">
                        <div class="flex items-center justify-between">
                            <span class="pixel-font text-sm text-blue-300">
                                ${match.player1?.username || 'Waiting...'}
                            </span>
                            ${match.winner?.id === match.player1?.id ? '<span class="text-xl winner-crown">👑</span>' : ''}
                        </div>
                    </div>

                    <!-- VS -->
                    <div class="text-center pixel-font text-xs text-blue-400/40">VS</div>

                    <!-- Player 2 -->
                    <div class="player-slot player-2 neon-border p-3 rounded ${match.winner?.id === match.player2?.id ? 'winner' : match.winner ? 'loser' : ''}" data-player-id="${match.player2?.id || ''}">
                        <div class="flex items-center justify-between">
                            <span class="pixel-font text-sm text-blue-300">
                                ${match.player2?.username || 'Waiting...'}
                            </span>
                            ${match.winner?.id === match.player2?.id ? '<span class="text-xl winner-crown">👑</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const updateMatchElement = (match: Match): void => {
        const matchElement = document.querySelector(`[data-match-id="${match.id}"]`);
        if (!matchElement) return;

        // Update status
        const statusEl = matchElement.querySelector('.match-status');
        if (statusEl) {
            const newStatus = getStatusText(match.status);
            if (statusEl.textContent !== newStatus) {
                statusEl.textContent = newStatus;
                
                // Update status color classes
                statusEl.className = `match-status pixel-font text-xs px-2 py-1 rounded border ${getStatusColor(match.status)}`;
                
                // Update match card classes
                matchElement.className = `match-card neon-border rounded-lg p-4 ${match.status} ${
                    match.player1?.id === myPlayerId || match.player2?.id === myPlayerId ? 'ring-2 ring-pink-500/50' : ''
                }`;
            }
        }

        // Update winner if changed
        if (match.winner) {
            const player1Slot = matchElement.querySelector('.player-1');
            const player2Slot = matchElement.querySelector('.player-2');

            if (player1Slot && player2Slot) {
                const isPlayer1Winner = match.winner.id === match.player1?.id;
                const isPlayer2Winner = match.winner.id === match.player2?.id;

                // Update player 1
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

                // Update player 2
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

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'ready': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
            case 'in_progress': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
            case 'finished': return 'bg-green-500/20 border-green-500/50 text-green-400';
            default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
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

    // Charger les données initiales
    fetchTournamentData();

    // Polling toutes les 2 secondes
    pollInterval = setInterval(fetchTournamentData, 2000);
    console.log('🔄 Started bracket polling');

    // ✅ FONCTION DE CLEANUP COMPLÈTE
    return (): void => {
        console.log('🧹 BracketView: Cleaning up...');
        
        cleanupIntervals();
        
        console.log('✅ BracketView: Cleanup complete');
    };
};
