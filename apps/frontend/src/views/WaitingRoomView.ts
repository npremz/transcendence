import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

export const WaitingRoomView: ViewFunction = () => {
    const content = `
            <div class="flex-1 flex items-center justify-center px-4 py-12">
                <div class="w-full max-w-4xl">
                    
                    <!-- Titre principal -->
                    <div class="text-center mb-12">
                        <h1 class="pixel-font text-5xl md:text-7xl text-blue-400 mb-4" 
                            style="animation: neonPulse 2s ease-in-out infinite;"
                            id="waiting-title">
                            SEARCHING FOR OPPONENT
                        </h1>
                        <p class="pixel-font text-lg text-blue-300 opacity-80" id="waiting-subtitle">
                            >>> PREPARING YOUR MATCH <<<
                        </p>
                    </div>

                    <!-- Animation de recherche -->
                    <div class="flex justify-center mb-12" id="search-animation">
                        <div class="relative">
                            <!-- Spinner principal -->
                            <div class="spinner"></div>
                            
                            <!-- Anneaux de pulse -->
                            <div class="pulse-ring" style="width: 120px; height: 120px; animation-delay: 0s;"></div>
                            <div class="pulse-ring" style="width: 120px; height: 120px; animation-delay: 0.5s;"></div>
                            <div class="pulse-ring" style="width: 120px; height: 120px; animation-delay: 1s;"></div>
                        </div>
                    </div>

                    <!-- Informations du joueur -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <!-- Votre carte -->
                        <div class="player-card neon-border rounded-lg p-6" id="your-card">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-500/50">
                                    <span class="text-3xl">👤</span>
                                </div>
                                <div class="flex-1">
                                    <div class="pixel-font text-xs text-blue-300/60 mb-1">YOU</div>
                                    <div class="pixel-font text-xl text-blue-400" id="your-username">Player</div>
                                </div>
                                <div class="status-indicator"></div>
                            </div>
                            
                            <!-- Skill sélectionné -->
                            <div class="mt-4 pt-4 border-t border-blue-500/30">
                                <div class="pixel-font text-xs text-blue-300/60 mb-2">SELECTED SKILL:</div>
                                <div class="flex items-center gap-2" id="your-skill">
                                    <span class="text-2xl">💥</span>
                                    <span class="pixel-font text-lg text-blue-300">SMASH</span>
                                </div>
                            </div>
                        </div>

                        <!-- Carte adversaire (en attente) -->
                        <div class="player-card neon-border rounded-lg p-6 opacity-50" id="opponent-card">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center border-2 border-gray-500/50">
                                    <span class="text-3xl">❓</span>
                                </div>
                                <div class="flex-1">
                                    <div class="pixel-font text-xs text-gray-400 mb-1">OPPONENT</div>
                                    <div class="pixel-font text-xl text-gray-400">Waiting...</div>
                                </div>
                                <div class="w-3 h-3 rounded-full bg-gray-500"></div>
                            </div>
                            
                            <div class="mt-4 pt-4 border-t border-gray-500/30">
                                <div class="pixel-font text-xs text-gray-400 mb-2">SKILL:</div>
                                <div class="pixel-font text-lg text-gray-400">???</div>
                            </div>
                        </div>
                    </div>

                    <!-- Status message -->
                    <div class="neon-border bg-black/50 backdrop-blur-sm rounded-lg p-6 mb-6" id="status-container">
                        <div class="flex items-center justify-center gap-3">
                            <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <p class="pixel-font text-sm text-blue-300 text-center" id="status-message">
                                Looking for available players...
                            </p>
                            <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <!-- Bouton Cancel -->
                    <div class="text-center">
                        <button 
                            id="cancel-btn"
                            class="pixel-font px-8 py-4 neon-border bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-white transition-all relative group"
                        >
                            <span class="relative z-10">>>> CANCEL SEARCH <<<</span>
                            <div class="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-all rounded"></div>
                        </button>
                    </div>

                    <!-- Tips -->
                    <div class="mt-8 text-center">
                        <div class="inline-block neon-border bg-blue-500/10 rounded-lg px-6 py-3">
                            <p class="pixel-font text-xs text-blue-300/60">
                                💡 TIP: Use SPACE to activate your skill at the right moment!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
    `;

    return Layout.render(content, {
        customHeader: Layout.renderWaitingRoomHeader(),
        showFooter: true,
        showParticles: true,
        particleCount: 30
    });
};

export const waitingRoomLogic = (): CleanupFunction => {
    console.log('🎮 WaitingRoomView: Initializing...');

	const cleanupManager = createCleanupManager();
    let pollInterval: number | null = null;
    let roomId: string | null = null;
    const skill = (sessionStorage.getItem('selectedSkill') as 'smash' | 'dash' | null) || 'smash';

    // ✅ DÉFINIR l'état initial AVANT d'animer
    gsap.set('#waiting-title', { scale: 0.5, opacity: 0 });
    gsap.set('#waiting-subtitle', { y: 20, opacity: 0 });
    gsap.set('#search-animation', { scale: 0, opacity: 0 });
    gsap.set('#your-card', { x: -100, opacity: 0 });
    gsap.set('#opponent-card', { x: 100, opacity: 0 });
    gsap.set('#status-container', { y: 50, opacity: 0 });
    gsap.set('#cancel-btn', { y: 50, opacity: 0 });

	// Enregistrer les cibles GSAP pour cleanup
	cleanupManager.registerGsapTarget('#waiting-title');
	cleanupManager.registerGsapTarget('#waiting-subtitle');
	cleanupManager.registerGsapTarget('#search-animation');
	cleanupManager.registerGsapTarget('#your-card');
	cleanupManager.registerGsapTarget('#opponent-card');
	cleanupManager.registerGsapTarget('#status-container');
	cleanupManager.registerGsapTarget('#cancel-btn');

    // ✅ PUIS animer vers l'état final
    cleanupManager.setTimeout(() => {
        gsap.to('#waiting-title', {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: 'back.out(1.7)'
        });

        gsap.to('#waiting-subtitle', {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: 0.3,
            ease: 'power2.out'
        });

        gsap.to('#search-animation', {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            delay: 0.5,
            ease: 'back.out(1.7)'
        });

        gsap.to('#your-card', {
            x: 0,
            opacity: 1,
            duration: 0.8,
            delay: 0.7,
            ease: 'power2.out'
        });

        gsap.to('#opponent-card', {
            x: 0,
            opacity: 1,
            duration: 0.8,
            delay: 0.7,
            ease: 'power2.out'
        });

        gsap.to('#status-container', {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: 0.9,
            ease: 'power2.out'
        });

        gsap.to('#cancel-btn', {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: 1.1,
            ease: 'power2.out'
        });
    }, 50);

    // Mettre à jour l'affichage du username et du skill
    const updatePlayerInfo = (): void => {
        const username = window.simpleAuth.getUsername() || 'Player';
        const usernameElement = document.getElementById('your-username');
        if (usernameElement) {
            usernameElement.textContent = username;
        }

        const skillElement = document.getElementById('your-skill');
        if (skillElement) {
            const skillIcon = skill === 'dash' ? '⚡' : '💥';
            const skillName = skill === 'dash' ? 'DASH' : 'SMASH';
            skillElement.innerHTML = `
                <span class="text-2xl">${skillIcon}</span>
                <span class="pixel-font text-lg text-blue-300">${skillName}</span>
            `;
        }
    };

    const updateStatus = (message: string): void => {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    };

    const handleJoin = async (): Promise<void> => {
        const username = window.simpleAuth.getUsername() || 'Player';
        const playerId = window.simpleAuth.getPlayerId();

        updateStatus('Connecting to matchmaking...');

        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/quickplay/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, playerId, selectedSkill: skill })
            });
            const data = await response.json();

            if (data.success) {
                roomId = data.roomId;

                // Si la room est déjà en status 'playing', mettre à jour le message et commencer le polling
                if (data.status === 'playing') {
                    updateStatus('Opponent found! Preparing game...');
                } else {
                    updateStatus('Waiting for opponent...');
                }

                // Toujours démarrer le polling pour vérifier quand le jeu est prêt
                startPolling();
            } else {
                // Gérer les erreurs de session multiple
                if (data.error === 'already_in_queue') {
                    updateStatus('⚠️ You are already in queue from another tab!');
                    setTimeout(() => {
                        window.router.navigate('/play');
                    }, 3000);
                } else if (data.error === 'already_in_game') {
                    updateStatus('⚠️ You are already in an active game!');
                    setTimeout(() => {
                        window.router.navigate('/play');
                    }, 3000);
                } else {
                    updateStatus('Error: ' + (data.message || data.error || 'Failed to join'));
                }
            }
        } catch (err) {
            console.error(err);
            updateStatus('Connection error');
        }
    };

    const startPolling = (): void => {
        pollInterval = setInterval(async () => {
            if (!roomId) return;
            
            try {
                const host = import.meta.env.VITE_HOST || 'localhost:8443';
                const response = await fetch(`https://${host}/quickplay/status/${roomId}`);
                const data = await response.json();
                
                if (data.status === 'ready') {
                    updateStatus('Opponent found! Preparing game...');
                    
                    // Animation de transition
                    const opponentCard = document.getElementById('opponent-card');
                    if (opponentCard) {
                        gsap.to(opponentCard, {
                            opacity: 1,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    }
                    
                    stopPolling();
                    sessionStorage.setItem('gameWsURL', data.gameServerURL);
                    
                    setTimeout(() => {
                        window.router.navigate(`/game/${roomId}`);
                    }, 1500);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000);
        
        console.log('🔄 Started polling for opponent');
    };

    const stopPolling = (): void => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('🛑 Stopped polling');
        }
    };

    const handleCancel = async (): Promise<void> => {
        stopPolling();

        // Notifier le serveur que le joueur quitte la file
        const playerId = window.simpleAuth.getPlayerId();
        if (playerId) {
            try {
                const host = import.meta.env.VITE_HOST || 'localhost:8443';
                await fetch(`https://${host}/quickplay/leave`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId })
                });
                console.log('🚪 Left matchmaking queue');
            } catch (err) {
                console.error('Failed to notify server of leaving queue:', err);
            }
        }

        // Animation de sortie
        gsap.to('#waiting-title, #search-animation, #your-card, #opponent-card, #status-container', {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => {
                window.router.navigate('/play');
            }
        });
    };

    // Démarrer après un court délai
    cleanupManager.setTimeout(() => {
        updatePlayerInfo();
        handleJoin();
    }, 100);

    // Attacher le handler du bouton Cancel
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancel);
		cleanupManager.onCleanup(() => {
			cancelBtn.removeEventListener('click', handleCancel);
		});
    }

	// Enregistrer le cleanup du polling et de la file d'attente
	cleanupManager.onCleanup(() => {
		stopPolling();

		// Retirer le joueur de la file d'attente si on quitte la page
		const playerId = window.simpleAuth.getPlayerId();
		if (playerId && roomId) {
			const host = import.meta.env.VITE_HOST || 'localhost:8443';
			fetch(`https://${host}/quickplay/leave`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId }),
				keepalive: true  // Important pour que la requête soit envoyée même si la page se ferme
			}).catch(err => console.warn('Failed to leave queue on cleanup:', err));
		}
	});

    // Cleanup
    return cleanupManager.getCleanupFunction();
};
