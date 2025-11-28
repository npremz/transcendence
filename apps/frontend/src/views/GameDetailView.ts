import type { ViewFunction } from "../router/types";
import { BackButton } from "../components/Button";
import { gsap } from "gsap";
import { createCleanupManager } from "../utils/CleanupManager";

interface GameDetail {
    id: string;
    room_id: string;
    game_type: 'quickplay' | 'tournament';
    tournament_id?: string;
    tournament_round?: number;
    player_left_id: string;
    player_right_id: string;
    player_left_username: string;
    player_right_username: string;
    winner_username?: string;
    score_left: number;
    score_right: number;
    status: string;
    end_reason?: 'score' | 'timeout' | 'forfeit';
    created_at: string;
    started_at?: string;
    finished_at?: string;
    duration_seconds?: number;
    stats: GameStat[];
    skills: SkillUsed[];
    powerUps: PowerUpUsed[];
    goals: Goal[];
}

interface GameStat {
    player_id: string;
    username: string;
    side: 'left' | 'right';
    paddle_hits: number;
    max_ball_speed: number;
    power_ups_collected: number;
    skills_used: number;
    time_disconnected_ms: number;
}

interface SkillUsed {
    player_id: string;
    username: string;
    skill_type: string;
    activated_at_game_time: number;
    was_successful: boolean;
}

interface PowerUpUsed {
    player_id: string;
    username: string;
    power_up_type: 'split' | 'blackout' | 'blackhole';
    collected_at_game_time?: number;
    activated_at_game_time: number;
}

interface Goal {
    id: number;
    game_id: string;
    scorer_side: 'left' | 'right';
    scored_against_side: 'left' | 'right';
    ball_y_position: number;
    scored_at_game_time: number;
}

export const GameDetailView: ViewFunction = (params) => {
    const gameId = params?.id || '';
    
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
            <div class="container mx-auto px-8 pb-8" data-game-id="${gameId}">
                <!-- Loading state -->
                <div id="game-loading" class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p class="text-white/60 mt-4">Chargement des détails...</p>
                </div>

                <!-- Content (sera injecté par JS) -->
                <div id="game-content" style="display: none;">
                    <!-- Le contenu sera généré dynamiquement -->
                </div>

                <!-- Error state -->
                <div id="game-error" style="display: none;" class="text-center py-12">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="text-2xl font-bold text-red-400 mb-2">Partie non trouvée</h3>
                    <p class="text-white/60">Impossible de charger les détails de cette partie</p>
                </div>
            </div>
        </div>
    `;
};

export const gameDetailLogic = (params?: Record<string, string>): (() => void) => {
    const cleanupManager = createCleanupManager();
    const gameId = params?.id;

    // Enregistrer les cibles GSAP
    cleanupManager.registerGsapTarget('#game-content > *');

    if (!gameId) {
        showError();
        return () => {};
    }

    const fetchGameDetails = async (): Promise<void> => {
        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/gamedb/games/${gameId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch game details');
            }

            const data = await response.json();
            
            if (data.success && data.game) {
                displayGameDetails(data.game);
                hideLoading();
            } else {
                showError();
            }
        } catch (err) {
            console.error('Error fetching game details:', err);
            showError();
        }
    };

    const displayGameDetails = (game: GameDetail): void => {
        const contentElement = document.getElementById('game-content');
        if (!contentElement) return;

        const date = new Date(game.created_at);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const duration = game.duration_seconds 
            ? `${Math.floor(game.duration_seconds / 60)}:${(game.duration_seconds % 60).toString().padStart(2, '0')}`
            : '-';

        const isWinner = game.score_left > game.score_right;
        const isDraw = game.score_left === game.score_right;
        const resultIcon = isWinner ? '🏆' : isDraw ? '🤝' : '💀';

        const gameTypeLabel = game.game_type === 'tournament' ? '🏆 Tournoi' : '⚡ QuickPlay';
        const gameTypeBg = game.game_type === 'tournament' ? 'bg-purple-500/20' : 'bg-blue-500/20';

        // Trouver les stats de chaque joueur
        const leftStats = game.stats.find(s => s.side === 'left');
        const rightStats = game.stats.find(s => s.side === 'right');

        // Grouper skills et power-ups par joueur
        const leftSkills = game.skills.filter(s => s.player_id === game.player_left_id);
        const rightSkills = game.skills.filter(s => s.player_id === game.player_right_id);
        const leftPowerUps = game.powerUps.filter(p => p.player_id === game.player_left_id);
        const rightPowerUps = game.powerUps.filter(p => p.player_id === game.player_right_id);

        // Calculer taux de réussite des skills par joueur
        const calculateSkillSuccessRate = (skills: SkillUsed[]) => {
            if (skills.length === 0) return { total: 0, successful: 0, rate: 0 };
            const successful = skills.filter(s => s.was_successful).length;
            return {
                total: skills.length,
                successful,
                rate: (successful / skills.length) * 100
            };
        };

        const leftSkillStats = calculateSkillSuccessRate(leftSkills);
        const rightSkillStats = calculateSkillSuccessRate(rightSkills);

        // Créer la timeline des événements (skills + power-ups)
        const createTimeline = () => {
            const events: Array<{
                time: number;
                type: 'skill' | 'powerup' | 'goal';
                player: string;
                playerId: string;
                data: SkillUsed | PowerUpUsed | Goal;
            }> = [];

            // Ajouter les skills
            game.skills.forEach(skill => {
                events.push({
                    time: skill.activated_at_game_time,
                    type: 'skill',
                    player: skill.username,
                    playerId: skill.player_id,
                    data: skill
                });
            });

            // Ajouter les power-ups
            game.powerUps.forEach(powerUp => {
                events.push({
                    time: powerUp.activated_at_game_time,
                    type: 'powerup',
                    player: powerUp.username,
                    playerId: powerUp.player_id,
                    data: powerUp
                });
            });

            // Ajouter les goals
            game.goals.forEach(goal => {
                const scorerUsername = goal.scorer_side === 'left' ? game.player_left_username : game.player_right_username;
                const scorerPlayerId = goal.scorer_side === 'left' ? game.player_left_id : game.player_right_id;
                events.push({
                    time: goal.scored_at_game_time,
                    type: 'goal',
                    player: scorerUsername,
                    playerId: scorerPlayerId,
                    data: goal
                });
            });

            // Trier par temps
            events.sort((a, b) => a.time - b.time);

            return events;
        };

        const timeline = createTimeline();

        contentElement.innerHTML = `
            <!-- Titre -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold text-white mb-2">Détails de la Partie</h1>
                <p class="text-white/60 text-lg">${formattedDate} à ${formattedTime}</p>
            </div>

            <!-- Infos principales -->
            <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-8 mb-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-4">
                        <div class="text-5xl">${resultIcon}</div>
                        <div>
                            <div class="text-3xl font-bold text-white">
                                ${isDraw ? 'ÉGALITÉ' : `Victoire de ${game.winner_username}`}
                            </div>
                            <div class="${gameTypeBg} inline-block px-4 py-2 rounded-lg text-white text-sm mt-2">
                                ${gameTypeLabel}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        ${game.end_reason ? `
                            <div class="text-white/60 text-sm mb-2">
                                ${game.end_reason === 'score' ? '🎯 Terminé au score' : 
                                  game.end_reason === 'timeout' ? '⏱️ Timeout' : 
                                  '🚫 Forfait'}
                            </div>
                        ` : ''}
                        <div class="text-white/60 text-sm">⏱️ Durée: ${duration}</div>
                    </div>
                </div>

                <!-- Score -->
                <div class="grid grid-cols-3 gap-8 items-center">
                    <div class="text-center">
                        <div class="text-white text-2xl font-semibold mb-3">
                            ${game.player_left_username}
                        </div>
                        <div class="text-6xl font-bold ${game.score_left > game.score_right ? 'text-green-400' : 'text-white/60'}">
                            ${game.score_left}
                        </div>
                    </div>
                    <div class="text-center">
                        <div class="text-white/40 text-3xl font-bold">VS</div>
                    </div>
                    <div class="text-center">
                        <div class="text-white text-2xl font-semibold mb-3">
                            ${game.player_right_username}
                        </div>
                        <div class="text-6xl font-bold ${game.score_right > game.score_left ? 'text-green-400' : 'text-white/60'}">
                            ${game.score_right}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Statistiques détaillées -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Stats joueur gauche -->
                <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
                    <h3 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>📊</span> Stats - ${game.player_left_username}
                    </h3>
                    ${leftStats ? `
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-white/60">🏓 Touches de paddle</span>
                                <span class="text-white font-bold text-xl">${leftStats.paddle_hits}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-white/60">🎁 Power-ups collectés</span>
                                <span class="text-white font-bold text-xl">${leftStats.power_ups_collected}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-white/60">💥 Skills utilisés</span>
                                <span class="text-white font-bold text-xl">${leftStats.skills_used}</span>
                            </div>
                            ${leftSkillStats.total > 0 ? `
                                <div class="flex justify-between items-center">
                                    <span class="text-white/60">🎯 Taux de réussite</span>
                                    <span class="${leftSkillStats.rate >= 50 ? 'text-green-400' : 'text-orange-400'} font-bold text-xl">
                                        ${leftSkillStats.rate.toFixed(0)}%
                                    </span>
                                </div>
                                <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <div class="h-full ${leftSkillStats.rate >= 50 ? 'bg-green-400' : 'bg-orange-400'} transition-all" 
                                         style="width: ${leftSkillStats.rate}%"></div>
                                </div>
                            ` : ''}
                            ${leftStats.time_disconnected_ms > 0 ? `
                                <div class="flex justify-between items-center">
                                    <span class="text-white/60">🔌 Temps déconnecté</span>
                                    <span class="text-red-400 font-bold text-xl">${(leftStats.time_disconnected_ms / 1000).toFixed(1)}s</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : '<p class="text-white/40">Aucune statistique disponible</p>'}
                </div>

                <!-- Stats joueur droit -->
                <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
                    <h3 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>📊</span> Stats - ${game.player_right_username}
                    </h3>
                    ${rightStats ? `
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-white/60">🏓 Touches de paddle</span>
                                <span class="text-white font-bold text-xl">${rightStats.paddle_hits}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-white/60">🎁 Power-ups collectés</span>
                                <span class="text-white font-bold text-xl">${rightStats.power_ups_collected}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-white/60">💥 Skills utilisés</span>
                                <span class="text-white font-bold text-xl">${rightStats.skills_used}</span>
                            </div>
                            ${rightSkillStats.total > 0 ? `
                                <div class="flex justify-between items-center">
                                    <span class="text-white/60">🎯 Taux de réussite</span>
                                    <span class="${rightSkillStats.rate >= 50 ? 'text-green-400' : 'text-orange-400'} font-bold text-xl">
                                        ${rightSkillStats.rate.toFixed(0)}%
                                    </span>
                                </div>
                                <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <div class="h-full ${rightSkillStats.rate >= 50 ? 'bg-green-400' : 'bg-orange-400'} transition-all" 
                                         style="width: ${rightSkillStats.rate}%"></div>
                                </div>
                            ` : ''}
                            ${rightStats.time_disconnected_ms > 0 ? `
                                <div class="flex justify-between items-center">
                                    <span class="text-white/60">🔌 Temps déconnecté</span>
                                    <span class="text-red-400 font-bold text-xl">${(rightStats.time_disconnected_ms / 1000).toFixed(1)}s</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : '<p class="text-white/40">Aucune statistique disponible</p>'}
                </div>
            </div>

            <!-- Heatmap des goals -->
            ${game.goals && game.goals.length > 0 ? `
                <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-6">
                    <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🎯</span> Heatmap des Goals
                    </h3>
                    
                    <!-- Terrain de jeu unifié -->
                    <div class="relative w-full" style="height: 400px;">
                        <!-- Terrain -->
                        <div class="absolute inset-0 bg-[#101C69]/40 rounded-lg border-2 border-white/20">
                            <!-- Ligne centrale verticale -->
                            <div class="absolute left-1/2 top-0 bottom-0 w-px bg-white/30"></div>
                            
                            <!-- Ligne centrale horizontale -->
                            <div class="absolute left-0 right-0 top-1/2 h-px bg-white/20"></div>
                            
                            <!-- Paddles visuels -->
                            <div class="absolute left-2 top-1/2 w-2 h-24 bg-blue-400/30 -translate-y-1/2 rounded"></div>
                            <div class="absolute right-2 top-1/2 w-2 h-24 bg-orange-400/30 -translate-y-1/2 rounded"></div>
                            
                            <!-- Goals marqués par le joueur de GAUCHE (bord droit) -->
                            ${game.goals.filter(g => g.scorer_side === 'left').map(goal => {
                                const yPercent = (goal.ball_y_position / 1080) * 100;
                                return `
                                    <div class="absolute" style="right: 0%; top: ${yPercent}%; transform: translate(50%, -50%);">
                                        <div class="w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 border-2 border-blue-300 animate-pulse" 
                                             title="${game.player_left_username} - ${goal.scored_at_game_time.toFixed(1)}s - Y: ${goal.ball_y_position.toFixed(0)}"></div>
                                    </div>
                                `;
                            }).join('')}
                            
                            <!-- Goals marqués par le joueur de DROITE (bord gauche) -->
                            ${game.goals.filter(g => g.scorer_side === 'right').map(goal => {
                                const yPercent = (goal.ball_y_position / 1080) * 100;
                                return `
                                    <div class="absolute" style="left: 0%; top: ${yPercent}%; transform: translate(-50%, -50%);">
                                        <div class="w-4 h-4 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50 border-2 border-orange-300 animate-pulse" 
                                             title="${game.player_right_username} - ${goal.scored_at_game_time.toFixed(1)}s - Y: ${goal.ball_y_position.toFixed(0)}"></div>
                                    </div>
                                `;
                            }).join('')}
                            
                            <!-- Labels -->
                            <div class="absolute top-2 left-1/2 -translate-x-1/2 text-white/40 text-xs font-semibold">Haut</div>
                            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/40 text-xs font-semibold">Bas</div>
                            
                            <!-- Noms des joueurs -->
                            <div class="absolute top-1/2 left-8 -translate-y-1/2 -rotate-90 text-blue-400 text-sm font-bold bg-[#04071A]/80 px-2 py-1 rounded">
                                ${game.player_left_username}
                            </div>
                            <div class="absolute top-1/2 right-8 -translate-y-1/2 rotate-90 text-orange-400 text-sm font-bold bg-[#04071A]/80 px-2 py-1 rounded">
                                ${game.player_right_username}
                            </div>
                        </div>
                    </div>

                    <!-- Légende -->
                    <div class="mt-6 flex justify-center gap-8">
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 border-2 border-blue-300"></div>
                            <span class="text-white/80 text-sm">Goals de ${game.player_left_username} (${game.goals.filter(g => g.scorer_side === 'left').length})</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50 border-2 border-orange-300"></div>
                            <span class="text-white/80 text-sm">Goals de ${game.player_right_username} (${game.goals.filter(g => g.scorer_side === 'right').length})</span>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Timeline des événements -->
            ${timeline.length > 0 ? `
                <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-6">
                    <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>📅</span> Timeline du Match
                    </h3>
                    
                    <!-- Filtres -->
                    <div class="flex flex-wrap gap-2 mb-6">
                        <button class="timeline-filter active px-3 py-1 rounded-lg bg-white/20 border border-white/30 text-white text-sm hover:bg-white/30 transition-all" data-filter="all">
                            Tout afficher
                        </button>
                        <button class="timeline-filter px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/30 transition-all" data-filter="goals">
                            🎯 Goals uniquement
                        </button>
                        <button class="timeline-filter px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/30 transition-all" data-filter="skills">
                            💥 Skills uniquement
                        </button>
                        <button class="timeline-filter px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/30 transition-all" data-filter="powerups">
                            ⚡ Power-ups uniquement
                        </button>
                    </div>
                    
                    <div class="relative" style="padding-top: 140px; padding-bottom: 120px;">
                        <!-- Ligne horizontale principale -->
                        <div class="absolute h-1 bg-gradient-to-r from-blue-500/20 via-white/30 to-orange-500/20 rounded" style="top: 150px; left: 0; right: 0;"></div>
                        
                        <!-- Goals (au-dessus de la ligne) -->
                        ${timeline.filter(e => e.type === 'goal').map((event, index) => {
                            const isLeft = event.playerId === game.player_left_id;
                            const goal = event.data as Goal;
                            const timePercent = game.duration_seconds ? (event.time / game.duration_seconds) * 100 : 50;
                            
                            return `
                                <div class="absolute timeline-event timeline-goal" style="left: ${timePercent}%; top: 0; transform: translateX(-50%);">
                                    <div class="flex flex-col items-center">
                                        <!-- Carte goal -->
                                        <div class="bg-gradient-to-br ${isLeft ? 'from-blue-500/20 to-blue-600/10 border-blue-400/40' : 'from-orange-500/20 to-orange-600/10 border-orange-400/40'} px-3 py-2 rounded-lg border-2 backdrop-blur-sm shadow-lg mb-2">
                                            <div class="text-2xl mb-1">🎯</div>
                                            <div class="text-xs font-bold ${isLeft ? 'text-blue-300' : 'text-orange-300'} whitespace-nowrap">${event.player}</div>
                                            <div class="text-xs text-white/60">${event.time.toFixed(1)}s</div>
                                        </div>
                                        <!-- Ligne vers timeline -->
                                        <div class="w-px ${isLeft ? 'bg-blue-400/60' : 'bg-orange-400/60'}" style="height: 50px;"></div>
                                        <!-- Point sur la timeline -->
                                        <div class="w-4 h-4 rounded-full ${isLeft ? 'bg-blue-500 border-blue-300' : 'bg-orange-500 border-orange-300'} border-2 shadow-lg"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        
                        <!-- Events (en dessous de la ligne, sans cascade) -->
                        ${timeline.filter(e => e.type !== 'goal').map((event, index) => {
                            const isLeft = event.playerId === game.player_left_id;
                            const isSkill = event.type === 'skill';
                            const timePercent = game.duration_seconds ? (event.time / game.duration_seconds) * 100 : 50;
                            const eventClass = isSkill ? 'timeline-skill' : 'timeline-powerup';
                            
                            if (isSkill) {
                                const skill = event.data as SkillUsed;
                                return `
                                    <div class="absolute timeline-event ${eventClass}" style="left: ${timePercent}%; top: 146px; transform: translateX(-50%);">
                                        <div class="flex flex-col items-center">
                                            <!-- Point sur la timeline -->
                                            <div class="w-3 h-3 rounded-full ${skill.was_successful ? 'bg-green-500 border-green-300' : 'bg-red-500 border-red-300'} border-2 shadow-md"></div>
                                            <!-- Ligne vers carte -->
                                            <div class="w-px ${skill.was_successful ? 'bg-green-400/40' : 'bg-red-400/40'}" style="height: 15px;"></div>
                                            <!-- Carte compacte -->
                                            <div class="bg-[#04071A]/95 px-2 py-1 rounded border ${skill.was_successful ? 'border-green-500/30' : 'border-red-500/30'} backdrop-blur-sm shadow-md">
                                                <div class="flex items-center gap-1">
                                                    <span class="text-lg">💥</span>
                                                    <div class="text-xs ${isLeft ? 'text-blue-300' : 'text-orange-300'} font-semibold whitespace-nowrap">${event.player}</div>
                                                    <span class="text-xs ${skill.was_successful ? 'text-green-400' : 'text-red-400'}">${skill.was_successful ? '✓' : '✗'}</span>
                                                </div>
                                                <div class="text-xs text-white/40 text-center">${event.time.toFixed(1)}s</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            } else {
                                const powerUp = event.data as PowerUpUsed;
                                const powerUpIcon = powerUp.power_up_type === 'split' ? '⚡' : 
                                                  powerUp.power_up_type === 'blackout' ? '🌑' : '🌀';
                                const powerUpColor = powerUp.power_up_type === 'split' ? 'border-yellow-500/30' : 
                                                   powerUp.power_up_type === 'blackout' ? 'border-purple-500/30' : 'border-cyan-500/30';
                                return `
                                    <div class="absolute timeline-event ${eventClass}" style="left: ${timePercent}%; top: 146px; transform: translateX(-50%);">
                                        <div class="flex flex-col items-center">
                                            <!-- Point sur la timeline -->
                                            <div class="w-3 h-3 rounded-full bg-cyan-500 border-2 border-cyan-300 shadow-md"></div>
                                            <!-- Ligne vers carte -->
                                            <div class="w-px bg-cyan-400/40" style="height: 15px;"></div>
                                            <!-- Carte compacte -->
                                            <div class="bg-[#04071A]/95 px-2 py-1 rounded border ${powerUpColor} backdrop-blur-sm shadow-md">
                                                <div class="flex items-center gap-1">
                                                    <span class="text-lg">${powerUpIcon}</span>
                                                    <div class="text-xs ${isLeft ? 'text-blue-300' : 'text-orange-300'} font-semibold whitespace-nowrap">${event.player}</div>
                                                </div>
                                                <div class="text-xs text-white/40 text-center">${event.time.toFixed(1)}s</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }
                        }).join('')}
                        
                        <!-- Marqueurs de temps -->
                        <div class="absolute left-0" style="top: 140px; transform: translateY(-50%);">
                            <div class="w-2 h-2 rounded-full bg-white/50"></div>
                        </div>
                        <div class="absolute right-0" style="top: 140px; transform: translateY(-50%);">
                            <div class="w-2 h-2 rounded-full bg-white/50"></div>
                        </div>
                    </div>
                    
                    <!-- Labels de temps -->
                    <div class="flex justify-between text-white/40 text-xs mt-2 px-2">
                        <span>🕐 0:00</span>
                        ${game.duration_seconds ? `<span>🏁 ${Math.floor(game.duration_seconds / 60)}:${(game.duration_seconds % 60).toString().padStart(2, '0')}</span>` : ''}
                    </div>
                    
                    <!-- Légende -->
                    <div class="flex flex-wrap justify-center gap-4 mt-6 text-xs">
                        <div class="flex items-center gap-1">
                            <div class="w-3 h-3 rounded-full bg-blue-500 border border-blue-300"></div>
                            <span class="text-white/60">Goal ${game.player_left_username}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <div class="w-3 h-3 rounded-full bg-orange-500 border border-orange-300"></div>
                            <span class="text-white/60">Goal ${game.player_right_username}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-lg">💥</span>
                            <span class="text-white/60">Skill</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-lg">⚡🌑🌀</span>
                            <span class="text-white/60">Power-ups</span>
                        </div>
                    </div>
                    
                    <style>
                        .timeline-event {
                            z-index: 1;
                            transition: opacity 0.3s ease;
                        }
                        .timeline-event:hover {
                            z-index: 100;
                        }
                        .timeline-event:hover > div > div:last-child {
                            transform: scale(1.15);
                            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
                        }
                        .timeline-event.hidden {
                            opacity: 0;
                            pointer-events: none;
                        }
                    </style>
                </div>
            ` : ''}

            ${game.tournament_id ? `
                <div class="mt-6 text-center">
                    <a href="/tournament/${game.tournament_id}" class="inline-block px-6 py-3 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-all">
                        → Voir le tournoi complet
                    </a>
                </div>
            ` : ''}
        `;

        contentElement.style.display = 'block';

        // Animations d'entrée
        gsap.fromTo('#game-content > *', 
            { opacity: 0, y: 20 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.6, 
                stagger: 0.1,
                ease: 'power2.out'
            }
        );
    };

    const hideLoading = (): void => {
        const loading = document.getElementById('game-loading');
        if (loading) loading.style.display = 'none';
    };

    const showError = (): void => {
        hideLoading();
        const error = document.getElementById('game-error');
        if (error) error.style.display = 'block';
    };

    // Gestion des filtres de timeline
    const setupTimelineFilters = (): void => {
        const filterButtons = document.querySelectorAll('.timeline-filter');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const filter = target.dataset.filter;
                
                if (!filter) return;
                
                // Mettre à jour les boutons actifs
                filterButtons.forEach(btn => {
                    btn.classList.remove('active', 'bg-white/20', 'border-white/30');
                    btn.classList.add('bg-white/10', 'border-white/20');
                });
                target.classList.add('active', 'bg-white/20', 'border-white/30');
                target.classList.remove('bg-white/10', 'border-white/20');
                
                // Filtrer les événements
                const allEvents = document.querySelectorAll('.timeline-event');
                
                allEvents.forEach(event => {
                    event.classList.remove('hidden');
                });
                
                if (filter === 'goals') {
                    document.querySelectorAll('.timeline-skill, .timeline-powerup').forEach(el => {
                        el.classList.add('hidden');
                    });
                } else if (filter === 'skills') {
                    document.querySelectorAll('.timeline-goal, .timeline-powerup').forEach(el => {
                        el.classList.add('hidden');
                    });
                } else if (filter === 'powerups') {
                    document.querySelectorAll('.timeline-goal, .timeline-skill').forEach(el => {
                        el.classList.add('hidden');
                    });
                }
            });
        });
    };

    // Charger les détails
    fetchGameDetails().then(() => {
        // Setup des filtres après que le contenu soit chargé
        cleanupManager.setTimeout(setupTimelineFilters, 100);
    });

    // Enregistrer le cleanup des filtres
    cleanupManager.onCleanup(() => {
        const filterButtons = document.querySelectorAll('.timeline-filter');
        filterButtons.forEach(button => {
            button.removeEventListener('click', () => {});
        });
    });

    return cleanupManager.getCleanupFunction();
};
