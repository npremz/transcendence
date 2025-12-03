import type { ViewFunction } from "../router/types";
import { BackButton } from "../components/Button";
import { gsap } from "gsap";
import { createCleanupManager } from "../utils/CleanupManager";

interface GameHistory {
    id: string;
    room_id: string;
    game_type: 'quickplay' | 'tournament';
    player_left_username: string;
    player_right_username: string;
    player_left_avatar?: string;
    player_right_avatar?: string;
    winner_username?: string;
    score_left: number;
    score_right: number;
    end_reason?: 'score' | 'timeout' | 'forfeit';
    created_at: string;
    duration_seconds?: number;
    tournament_id?: string;
}

export const HistoryView: ViewFunction = () => {
    return `
        <!-- Fond étoilé -->
        <div class="fixed inset-0 bg-[#04071A] overflow-hidden">
            ${Array.from({length: 150}, (_, i) => `
                <div 
                    class="absolute bg-white rounded-full ${i % 7 === 0 ? 'animate-pulse' : ''}"
                    style="
                        width: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
                        height: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        opacity: ${0.3 + Math.random() * 0.7};
                        ${i % 7 === 0 ? `animation-delay: ${Math.random() * 5}s;` : ''}
                    "
                ></div>
            `).join('')}
            
            <!-- Étoiles qui scintillent fort -->
            ${Array.from({length: 50}, (_) => `
                <div 
                    class="absolute"
                    style="
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        animation: strong-sparkle ${4 + Math.random() * 3}s ease-in-out ${Math.random() * 10}s infinite;
                    "
                >
                    <div class="w-[4px] h-[4px] bg-white rounded-full"></div>
                </div>
            `).join('')}
            
            <style>
                @keyframes strong-sparkle {
                    0%, 100% {
                        opacity: 0.3;
                        filter: blur(0px);
                    }
                    50% {
                        opacity: 1;
                        filter: blur(0px) drop-shadow(0 0 10px white) drop-shadow(0 0 20px white);
                    }
                }
            </style>
        </div>

        <!-- Contenu principal -->
        <div class="relative z-10 min-h-screen">
            <!-- Header avec BackButton -->
            <div class="p-8">
                ${BackButton({
                    size: "lg",
                    className: "text-center text-white z-10 p-4 rounded bg-[#0C154D]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
                })}
            </div>

            <!-- Container principal -->
            <div class="container mx-auto px-8 pb-8">
                <!-- Titre -->
                <div class="text-center mb-8">
                    <h1 class="text-5xl font-bold text-white mb-2">Historique Global</h1>
                    <p class="text-white/60 text-lg">Toutes les parties jouées</p>
                </div>

                <!-- Filtres -->
                <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-6">
                    <div class="flex flex-wrap gap-4 items-center justify-between">
                        <div class="flex gap-4">
                            <button 
                                id="filter-all" 
                                class="filter-btn active px-6 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                                data-filter="all"
                            >
                                Toutes
                            </button>
                            <button 
                                id="filter-quickplay" 
                                class="filter-btn px-6 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                                data-filter="quickplay"
                            >
                                QuickPlay
                            </button>
                            <button 
                                id="filter-tournament" 
                                class="filter-btn px-6 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                                data-filter="tournament"
                            >
                                Tournois
                            </button>
                        </div>
                        
                        <div class="flex gap-4 items-center">
                            <span class="text-white/60">Trier par:</span>
                            <select 
                                id="sort-select" 
                                class="px-4 py-2 rounded-lg bg-[#101C69]/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="recent">Plus récent</option>
                                <option value="oldest">Plus ancien</option>
                                <option value="duration">Durée</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Stats globales -->
                <div id="global-stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <!-- Stats seront injectées ici -->
                </div>

                <!-- Loading state -->
                <div id="history-loading" class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p class="text-white/60 mt-4">Chargement de l'historique...</p>
                </div>

                <!-- Liste des parties -->
                <div id="history-list" style="display: none;" class="space-y-4">
                    <!-- Les parties seront injectées ici -->
                </div>

                <!-- Empty state -->
                <div id="history-empty" style="display: none;" class="text-center py-12">
                    <div class="text-6xl mb-4">🎮</div>
                    <h3 class="text-2xl font-bold text-white mb-2">Aucune partie trouvée</h3>
                    <p class="text-white/60">Commencez à jouer pour voir votre historique !</p>
                </div>

                <!-- Error state -->
                <div id="history-error" style="display: none;" class="text-center py-12">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="text-2xl font-bold text-red-400 mb-2">Erreur de chargement</h3>
                    <p class="text-white/60">Impossible de charger l'historique</p>
                </div>
            </div>
        </div>
    `;
};

export const historyLogic = (): (() => void) => {
    const cleanupManager = createCleanupManager();
    let allGames: GameHistory[] = [];
    let filteredGames: GameHistory[] = [];
    let currentFilter: 'all' | 'quickplay' | 'tournament' = 'all';
    let currentSort: 'recent' | 'oldest' | 'duration' = 'recent';

    // Enregistrer les cibles GSAP
    cleanupManager.registerGsapTarget('.game-card');
    cleanupManager.registerGsapTarget('.stat-card');

    // Fonction pour récupérer l'historique global
    const fetchHistory = async (): Promise<void> => {
        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/gamedb/games/history`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }

            const data = await response.json();
            
            if (data.success) {
                allGames = data.games;
				console.log(allGames)
                applyFiltersAndSort();
                displayGames();
                displayGlobalStats();
                hideLoading();
            } else {
                showError();
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            showError();
        }
    };

    // Appliquer les filtres et le tri
    const applyFiltersAndSort = (): void => {
        // Filtrer
        if (currentFilter === 'all') {
            filteredGames = [...allGames];
        } else {
            filteredGames = allGames.filter(game => game.game_type === currentFilter);
        }

        // Trier
        switch (currentSort) {
            case 'recent':
                filteredGames.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                break;
            case 'oldest':
                filteredGames.sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                break;
            case 'duration':
                filteredGames.sort((a, b) => 
                    (b.duration_seconds || 0) - (a.duration_seconds || 0)
                );
                break;
        }
    };

    // Afficher les parties
    const displayGames = (): void => {
        const listElement = document.getElementById('history-list');
        const emptyElement = document.getElementById('history-empty');
        
        if (!listElement || !emptyElement) return;

        if (filteredGames.length === 0) {
            listElement.style.display = 'none';
            emptyElement.style.display = 'block';
            return;
        }

        listElement.style.display = 'block';
        emptyElement.style.display = 'none';

        listElement.innerHTML = filteredGames.map(game => {
            const isWinner = game.score_left > game.score_right;
            const isDraw = game.score_left === game.score_right;
            const resultIcon = isWinner ? '🏆' : isDraw ? '🤝' : '💀';
            const winnerName = game.winner_username || (isWinner ? game.player_left_username : game.player_right_username);

            const date = new Date(game.created_at);
            const formattedDate = date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const duration = game.duration_seconds 
                ? `${Math.floor(game.duration_seconds / 60)}:${(game.duration_seconds % 60).toString().padStart(2, '0')}`
                : '-';

            const gameTypeLabel = game.game_type === 'tournament' ? '🏆 Tournoi' : '⚡ QuickPlay';
            const gameTypeBg = game.game_type === 'tournament' ? 'bg-purple-500/20' : 'bg-blue-500/20';

            return `
                <a href="/history/${game.id}" class="block game-card bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6 hover:border-white/40 hover:bg-[#0C154D]/40 transition-all cursor-pointer">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="text-4xl">${resultIcon}</div>
                            <div>
                                <div class="text-2xl font-bold text-white">
                                    ${isDraw ? 'ÉGALITÉ' : `Victoire de ${winnerName}`}
                                </div>
                                <div class="text-white/60 text-sm">${formattedDate} à ${formattedTime}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="${gameTypeBg} px-4 py-2 rounded-lg text-white text-sm mb-2">
                                ${gameTypeLabel}
                            </div>
                            ${game.end_reason ? `
                                <div class="text-white/60 text-xs">
                                    ${game.end_reason === 'score' ? '🎯 Score' : 
                                      game.end_reason === 'timeout' ? '⏱️ Timeout' : 
                                      '🚫 Forfait'}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4 items-center">
                        <!-- Joueur gauche -->
                        <div class="text-center">
                            <div class="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden border-2 ${game.score_left > game.score_right ? 'border-green-400' : 'border-white/30'}">
                                <img 
                                    src="${game.player_left_avatar || '/sprites/cat.gif'}" 
                                    alt="${game.player_left_username}" 
                                    class="w-full h-full object-cover"
                                    style="image-rendering: pixelated;"
                                />
                            </div>
                            <div class="text-white font-semibold text-lg mb-2">
                                ${game.player_left_username}
                            </div>
                            <div class="text-4xl font-bold ${game.score_left > game.score_right ? 'text-green-400' : 'text-white/60'}">
                                ${game.score_left}
                            </div>
                        </div>

                        <!-- VS -->
                        <div class="text-center">
                            <div class="text-white/40 text-2xl font-bold">VS</div>
                            ${duration !== '-' ? `
                                <div class="text-white/60 text-sm mt-2">
                                    ⏱️ ${duration}
                                </div>
                            ` : ''}
                        </div>

                        <!-- Joueur droit -->
                        <div class="text-center">
                            <div class="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden border-2 ${game.score_right > game.score_left ? 'border-green-400' : 'border-white/30'}">
                                <img 
                                    src="${game.player_right_avatar || '/sprites/cat.gif'}" 
                                    alt="${game.player_right_username}" 
                                    class="w-full h-full object-cover"
                                    style="image-rendering: pixelated;"
                                />
                            </div>
                            <div class="text-white font-semibold text-lg mb-2">
                                ${game.player_right_username}
                            </div>
                            <div class="text-4xl font-bold ${game.score_right > game.score_left ? 'text-green-400' : 'text-white/60'}">
                                ${game.score_right}
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-white/10 text-center">
                        <span class="text-blue-400 hover:text-blue-300 text-sm">
                            → Voir les détails
                        </span>
                    </div>
                </a>
            `;
        }).join('');

        // Animation d'entrée
        gsap.fromTo('.game-card', 
            { opacity: 0, y: 20 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.5, 
                stagger: 0.1,
                ease: 'power2.out'
            }
        );
    };

    // Afficher les stats globales
    const displayGlobalStats = (): void => {
        const statsElement = document.getElementById('global-stats');
        if (!statsElement) return;

        const totalGames = allGames.length;
        const quickplayGames = allGames.filter(g => g.game_type === 'quickplay').length;
        const tournamentGames = allGames.filter(g => g.game_type === 'tournament').length;

        const totalDuration = allGames.reduce((sum, game) => sum + (game.duration_seconds || 0), 0);
        let avgDuration = '0:00';
        if (totalGames > 0) {
            const avgSeconds = totalDuration / totalGames;
            const minutes = Math.floor(avgSeconds / 60);
            const seconds = Math.floor(avgSeconds % 60);
            avgDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        statsElement.innerHTML = `
            <div class="stat-card bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
                <div class="text-white/60 text-sm mb-2">Total Parties</div>
                <div class="text-4xl font-bold text-white">${totalGames}</div>
            </div>
            
            <div class="stat-card bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
                <div class="text-white/60 text-sm mb-2">QuickPlay</div>
                <div class="text-4xl font-bold text-blue-400">${quickplayGames}</div>
            </div>
            
            <div class="stat-card bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
                <div class="text-white/60 text-sm mb-2">Tournois</div>
                <div class="text-4xl font-bold text-purple-400">${tournamentGames}</div>
            </div>
            
            <div class="stat-card bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
                <div class="text-white/60 text-sm mb-2">Durée Moyenne</div>
                <div class="text-4xl font-bold text-green-400">${avgDuration}</div>
            </div>
        `;

        // Animation des stats
        gsap.fromTo('.stat-card', 
            { scale: 0.8, opacity: 0 },
            { 
                scale: 1, 
                opacity: 1, 
                duration: 0.5, 
                stagger: 0.1,
                ease: 'back.out(1.7)'
            }
        );
    };

    // Gestion des filtres
    const handleFilterClick = (e: Event): void => {
        const target = e.target as HTMLElement;
        const filter = target.dataset.filter as 'all' | 'quickplay' | 'tournament';
        
        if (!filter) return;

        currentFilter = filter;

        // Mettre à jour l'UI des boutons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-white/30');
        });
        target.classList.add('active', 'bg-white/30');

        applyFiltersAndSort();
        displayGames();
    };

    // Gestion du tri
    const handleSortChange = (e: Event): void => {
        const target = e.target as HTMLSelectElement;
        currentSort = target.value as 'recent' | 'oldest' | 'duration';
        
        applyFiltersAndSort();
        displayGames();
    };

    // Utilitaires d'affichage
    const hideLoading = (): void => {
        const loading = document.getElementById('history-loading');
        if (loading) loading.style.display = 'none';
    };

    const showError = (): void => {
        hideLoading();
        const error = document.getElementById('history-error');
        if (error) error.style.display = 'block';
    };

    // Attacher les event listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSortChange);
    }

    // Charger l'historique
    fetchHistory();

    // Enregistrer le cleanup
    cleanupManager.onCleanup(() => {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.removeEventListener('click', handleFilterClick);
        });

        if (sortSelect) {
            sortSelect.removeEventListener('change', handleSortChange);
        }
    });

    return cleanupManager.getCleanupFunction();
};
