import type { ViewFunction } from "../router/types";
import { BackButton } from "../components/Button";
import { gsap } from "gsap";

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
    const gameId = params?.id;
    
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
                type: 'skill' | 'powerup';
                player: string;
                playerId: string;
                data: SkillUsed | PowerUpUsed;
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
                                <span class="text-white/60">⚡ Vitesse max balle</span>
                                <span class="text-white font-bold text-xl">${leftStats.max_ball_speed.toFixed(1)}</span>
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
                                <span class="text-white/60">⚡ Vitesse max balle</span>
                                <span class="text-white font-bold text-xl">${rightStats.max_ball_speed.toFixed(1)}</span>
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

            <!-- Timeline des événements -->
            ${timeline.length > 0 ? `
                <div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-6">
                    <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>📅</span> Timeline des Événements
                    </h3>
                    
                    <div class="relative">
                        <!-- Ligne centrale -->
                        <div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2"></div>
                        
                        <!-- Événements -->
                        <div class="space-y-6">
                            ${timeline.map((event, index) => {
                                const isLeft = event.playerId === game.player_left_id;
                                const isSkill = event.type === 'skill';
                                
                                if (isSkill) {
                                    const skill = event.data as SkillUsed;
                                    return `
                                        <div class="relative flex ${isLeft ? 'justify-start' : 'justify-end'} items-center">
                                            <!-- Connecteur -->
                                            <div class="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${skill.was_successful ? 'bg-green-500' : 'bg-red-500'} border-4 border-[#04071A] z-10"></div>
                                            
                                            <!-- Carte événement -->
                                            <div class="${isLeft ? 'mr-auto pr-[52%]' : 'ml-auto pl-[52%]'} w-full">
                                                <div class="bg-white/5 backdrop-blur-sm rounded-lg p-4 border ${skill.was_successful ? 'border-green-500/30' : 'border-red-500/30'}">
                                                    <div class="flex ${isLeft ? 'flex-row' : 'flex-row-reverse'} items-center gap-3 mb-2">
                                                        <div class="text-2xl">💥</div>
                                                        <div class="${isLeft ? 'text-left' : 'text-right'} flex-1">
                                                            <div class="text-white font-semibold">${event.player}</div>
                                                            <div class="text-white/60 text-xs">⏱️ ${event.time.toFixed(1)}s</div>
                                                        </div>
                                                        <div class="${skill.was_successful ? 'text-green-400' : 'text-red-400'} font-bold text-sm">
                                                            ${skill.was_successful ? '✓' : '✗'}
                                                        </div>
                                                    </div>
                                                    <div class="text-white/80 text-sm ${isLeft ? 'text-left' : 'text-right'}">
                                                        <span class="font-mono bg-white/10 px-2 py-1 rounded text-xs">${skill.skill_type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                } else {
                                    const powerUp = event.data as PowerUpUsed;
                                    const powerUpIcon = powerUp.power_up_type === 'split' ? '⚡' : 
                                                      powerUp.power_up_type === 'blackout' ? '🌑' : '🌀';
                                    const powerUpColor = powerUp.power_up_type === 'split' ? 'border-yellow-500/30' : 
                                                       powerUp.power_up_type === 'blackout' ? 'border-purple-500/30' : 'border-blue-500/30';
                                    return `
                                        <div class="relative flex ${isLeft ? 'justify-start' : 'justify-end'} items-center">
                                            <!-- Connecteur -->
                                            <div class="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-4 border-[#04071A] z-10"></div>
                                            
                                            <!-- Carte événement -->
                                            <div class="${isLeft ? 'mr-auto pr-[52%]' : 'ml-auto pl-[52%]'} w-full">
                                                <div class="bg-white/5 backdrop-blur-sm rounded-lg p-4 border ${powerUpColor}">
                                                    <div class="flex ${isLeft ? 'flex-row' : 'flex-row-reverse'} items-center gap-3 mb-2">
                                                        <div class="text-2xl">${powerUpIcon}</div>
                                                        <div class="${isLeft ? 'text-left' : 'text-right'} flex-1">
                                                            <div class="text-white font-semibold">${event.player}</div>
                                                            <div class="text-white/60 text-xs">⏱️ ${event.time.toFixed(1)}s</div>
                                                        </div>
                                                    </div>
                                                    <div class="text-white/80 text-sm ${isLeft ? 'text-left' : 'text-right'}">
                                                        <span class="font-mono bg-white/10 px-2 py-1 rounded text-xs">${powerUp.power_up_type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }
                            }).join('')}
                        </div>
                    </div>
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

    // Charger les détails
    fetchGameDetails();

    // Cleanup
    return (): void => {
        // Pas de listeners à nettoyer pour le moment
    };
};
