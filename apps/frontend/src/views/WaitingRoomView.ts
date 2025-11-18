import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";

export const WaitingRoomView: ViewFunction = () => {
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

                @keyframes rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                @keyframes ping {
                    0% { transform: scale(1); opacity: 1; }
                    75%, 100% { transform: scale(2); opacity: 0; }
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
                
                .neon-border:hover {
                    box-shadow: 
                        0 0 20px rgba(59, 130, 246, 0.8),
                        inset 0 0 20px rgba(59, 130, 246, 0.3);
                    border-color: rgba(59, 130, 246, 1);
                }

                .spinner {
                    border: 4px solid rgba(59, 130, 246, 0.1);
                    border-left-color: rgba(59, 130, 246, 1);
                    border-radius: 50%;
                    width: 120px;
                    height: 120px;
                    animation: rotate 1s linear infinite;
                }

                .pulse-ring {
                    position: absolute;
                    border: 4px solid rgba(59, 130, 246, 0.6);
                    border-radius: 50%;
                    animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                }

                .player-card {
                    transition: all 0.3s ease;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(10px);
                }

                .status-indicator {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 10px #10b981;
                    animation: neonPulse 2s ease-in-out infinite;
                }
            </style>
            
            <!-- Scanline effect -->
            <div class="absolute inset-0 pointer-events-none opacity-10">
                <div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
            </div>

            <!-- Particules flottantes -->
            ${Array.from({length: 30}, (_, i) => `
                <div 
                    class="absolute bg-blue-400 rounded-full opacity-20"
                    style="
                        width: ${2 + Math.random() * 3}px;
                        height: ${2 + Math.random() * 3}px;
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        animation: float ${10 + Math.random() * 20}s ease-in-out ${Math.random() * 5}s infinite;
                    "
                ></div>
            `).join('')}
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
                
                <!-- Status indicator -->
                <div class="flex items-center gap-3 neon-border bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                    <div class="status-indicator"></div>
                    <span class="pixel-font text-sm text-blue-300">SEARCHING</span>
                </div>
            </header>

            <!-- Zone centrale -->
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

            <!-- Footer -->
            <footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
                <p>© 2025 PONG - SKILL ISSUE</p>
            </footer>
        </div>
    `;
};

export const waitingRoomLogic = (): CleanupFunction => {
    console.log('🎮 WaitingRoomView: Initializing...');

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

    // ✅ PUIS animer vers l'état final
    setTimeout(() => {
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
                updateStatus('Waiting for opponent...');
                startPolling();
            } else {
                updateStatus('Error: ' + (data.error || 'Failed to join'));
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
                    }, 1000);
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

    const handleCancel = (): void => {
        stopPolling();
        
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
    setTimeout(() => {
        updatePlayerInfo();
        handleJoin();
    }, 100);

    // Attacher le handler du bouton Cancel
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancel);
    }

    // Cleanup
    return (): void => {
        console.log('🧹 WaitingRoomView: Cleaning up...');
        stopPolling();
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', handleCancel);
        }
    };
};
