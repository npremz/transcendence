import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";

export const HomeView: ViewFunction = () => {
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
            
            
            <!-- Scanline effect -->
            <div class="absolute inset-0 pointer-events-none opacity-10">
                <div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
            </div>
        </div>

        <!-- Contenu principal -->
        <div class="relative z-10 min-h-screen flex flex-col">
            <!-- Header avec PONG et bouton connexion -->
            <header class="flex justify-between items-center px-8 py-6">
                <!-- Logo PONG -->
                <div class="pixel-font text-4xl md:text-5xl text-blue-400" style="animation: neonPulse 2s ease-in-out infinite;">
                    PONG
                </div>
                
                <!-- Bouton Connexion -->
                <a href="/login" 
                   class="pixel-font bg-blue-500 opacity-80 text-black px-6 py-3 text-sm md:text-base hover:bg-blue-400 transition-all neon-border flex items-center gap-2">
                    <span>SIGN IN</span>
                </a>
            </header>

            <!-- Ligne horizontale néon -->
            <div class="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

            <!-- Zone centrale -->
            <div class="flex-1 flex flex-col items-center justify-center px-4 py-12">
                <!-- Titre principal -->
                <div class="text-center mb-8">
                    <h1 class="pixel-font text-6xl md:text-8xl text-blue-400 mb-4" 
                        style="animation: neonPulse 2s ease-in-out infinite;"
                        id="main-title">
                        PONG
                    </h1>
                    <p class="pixel-font text-lg md:text-xl text-blue-300 tracking-wider">
                        >>> SKILL ISSUE <<<
                    </p>
                </div>

                <!-- Stats en temps réel -->
                <div class="flex gap-8 md:gap-16 mb-16" id="stats-display">
                    <div class="text-center">
                        <div class="pixel-font text-5xl md:text-6xl text-blue-400" id="players-count">0</div>
                        <div class="pixel-font text-xs md:text-sm text-blue-300 mt-2">PLAYER</div>
                    </div>
                    <div class="text-center">
                        <div class="pixel-font text-5xl md:text-6xl text-blue-400" id="games-count">0</div>
                        <div class="pixel-font text-xs md:text-sm text-blue-300 mt-2">IN GAME</div>
                    </div>
                    <div class="text-center">
                        <div class="pixel-font text-5xl md:text-6xl text-blue-400" id="online-count">0</div>
                        <div class="pixel-font text-xs md:text-sm text-blue-300 mt-2">ONLINE</div>
                    </div>
                </div>

                <!-- Cartes de jeu -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-12">
                    <!-- QuickPlay Card -->
                    <a href="/play" 
                       class="game-card group relative p-8 md:p-12 neon-border hover:cursor-pointer"
                       id="quickplay-card"
                       style="opacity: 0; transform: translateY(100px);">
                        <!-- Icône -->
                        <div class="text-6xl md:text-7xl mb-6 text-center text-blue-500">
                            ⚡
                        </div>
                        
                        <!-- Titre -->
                        <h2 class="pixel-font text-2xl md:text-3xl text-blue-400 text-center opacity-80 mb-4">
                            QUICKPLAY
                        </h2>
                        
                        <!-- Description -->
                        <p class="pixel-font text-sm text-blue-300 text-center opacity-80">
                            Time to train
                        </p>
                        
                        <!-- Flèches décoratives -->
                        <div class="absolute top-4 left-4 text-red-500 text-2xl opacity-80">←</div>
                        <div class="absolute bottom-4 right-4 text-red-500 text-2xl opacity-80">→</div>
                    </a>

                    <!-- Tournois Card -->
                    <a href="/tournament" 
                       class="game-card group relative p-8 md:p-12 neon-border hover:cursor-pointer"
                       id="tournament-card"
                       style="opacity: 0; transform: translateY(100px);">
                        <!-- Icône -->
                        <div class="text-6xl md:text-7xl mb-6 text-center">
                            🏆
                        </div>
                        
                        <!-- Titre -->
                        <h2 class="pixel-font text-2xl md:text-3xl text-red-500 text-center opacity-80 mb-4">
                            TOURNAMENT
                        </h2>
                        
                        <!-- Description -->
                        <p class="pixel-font text-sm text-blue-300 text-center opacity-80">
							Compete against the best players
                        </p>
                        
                        <!-- Flèches décoratives -->
                        <div class="absolute top-4 left-4 text-blue-500 text-2xl opacity-80">←</div>
                        <div class="absolute bottom-4 right-4 text-blue-500 text-2xl opacity-80">→</div>
                    </a>
                </div>

                <!-- Leaderboard -->
                <div class="w-full max-w-4xl neon-border p-6" style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px);">
                    <h3 class="pixel-font text-xl md:text-2xl text-blue-400 mb-6 flex items-center gap-2">
                        <span>👑</span>
                        <span>RANKING</span>
                    </h3>
                    
                    <div id="leaderboard-container" class="overflow-hidden">
                        <p class="pixel-font text-sm text-blue-300 text-center py-4">Loading...</p>
                    </div>
                </div>
				<div class="mt-8">
					<a href="/blockchain" class="pixel-font text-purple-400 hover:text-purple-300 text-sm flex items-center justify-center gap-2 transition-colors">
						<span>VIEW BLOCKCHAIN REGISTRY</span>
					</a>
				</div>
            </div>

            <!-- Footer -->
            <footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
                <p>© 2025 PONG - SKILL ISSUE</p>
            </footer>
        </div>
    `;
};

export const homeLogic = (): CleanupFunction => {
    // Animation d'entrée du titre
    gsap.to('#main-title', {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: 'back.out(1.7)'
    });

    // Animation des stats (depuis l'état initial dans le HTML)
    gsap.to('#stats-display > div', {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out'
    });

    // Animation des cartes de jeu - UNE SEULE FOIS
    gsap.to('#quickplay-card', {
        y: 0,
        opacity: 1,
        duration: 1,
        delay: 0.5,
        ease: 'power3.out'
    });

    gsap.to('#tournament-card', {
        y: 0,
        opacity: 1,
        duration: 1,
        delay: 0.8,
        ease: 'power3.out'
    });

    // Animation des chiffres (compteur)
    const animateCounter = (id: string, target: number) => {
        const element = document.getElementById(id);
        if (!element) return;

        gsap.to({ val: 0 }, {
            val: target,
            duration: 2,
            ease: 'power1.inOut',
            onUpdate: function() {
                element.textContent = Math.floor(this.targets()[0].val).toString();
            }
        });
    };

    // Charger les stats globales
    const loadGlobalStats = async () => {
        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/gamedb/stats/global`);
            const data = await response.json();
            
            if (data.success && data.stats) {
                animateCounter('players-count', data.stats.total_users);
                animateCounter('games-count', data.stats.active_games);
                animateCounter('online-count', data.stats.online_players);
            }
        } catch (err) {
            console.error('Error loading global stats:', err);
            // Valeurs par défaut en cas d'erreur
            animateCounter('players-count', 0);
            animateCounter('games-count', 0);
            animateCounter('online-count', 0);
        }
    };

    // Charger les stats du leaderboard
    const loadLeaderboard = async () => {
        try {
            const response = await fetch('/gamedb/users/leaderboard');
            const data = await response.json();
            
            if (data.success && data.leaderboard) {
                const container = document.getElementById('leaderboard-container');
                if (container) {
                    const topPlayers = data.leaderboard.slice(0, 5);
                    
                    container.innerHTML = `
                        <div class="space-y-2">
                            ${topPlayers.map((user: any, index: number) => `
                                <div class="flex items-center justify-between p-3 ${index % 2 === 0 ? 'bg-blue-950/20' : 'bg-transparent'} hover:bg-blue-900/30 transition-colors">
                                    <div class="flex items-center gap-4">
                                        <span class="pixel-font text-xl ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-600' : 'text-blue-400'}">
                                            ${index + 1}
                                        </span>
                                        <span class="pixel-font text-sm text-blue-300">${user.username}</span>
                                    </div>
                                    <div class="flex gap-6 text-xs pixel-font">
                                        <span class="text-blue-400">${user.total_games || 0} parties</span>
                                        <span class="text-green-400">${user.total_wins || 0} victoires</span>
                                        <span class="text-pink-400">${user.win_rate || 0}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <a href="/history" class="block mt-4 text-center pixel-font text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            >>> View the complete history <<<
                        </a>
                    `;
                }
            }
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            const container = document.getElementById('leaderboard-container');
            if (container) {
                container.innerHTML = `
                    <p class="pixel-font text-sm text-pink-500 text-center py-4">
                        ⚠️ Loading error
                    </p>
                `;
            }
        }
    };

    // Charger les données au démarrage
    loadGlobalStats();
    loadLeaderboard();

    // Rafraîchir les stats toutes les 30 secondes
    const statsInterval = setInterval(loadGlobalStats, 30000);

    // Arrêter le polling si l'utilisateur quitte l'onglet
    const handleVisibilityChange = () => {
        if (document.hidden) {
            clearInterval(statsInterval);
        } else {
            loadGlobalStats(); // Refresh immédiat au retour
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
        clearInterval(statsInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
};
