import type { ViewFunction, CleanupFunction } from "../router/types";
import { gsap } from "gsap";
import { Layout } from "../components/Layout";
import { createCleanupManager } from "../utils/CleanupManager";

export const TournamentView: ViewFunction = () => {
    const content = `
            <div class="flex-1 flex items-center justify-center px-4 py-12">
                <div class="w-full max-w-4xl">
                    
					<!-- Titre principal -->
					<div class="text-center mb-12">
						<h1 class="pixel-font text-6xl md:text-8xl text-blue-400 mb-4" 
							style="animation: neonPulse 2s ease-in-out infinite;"
							id="tournament-title">
							TOURNAMENT
						</h1>
						<p class="pixel-font text-lg md:text-xl text-blue-300 tracking-wider">
							>>> SKILL ISSUE <<<
						</p>
					</div>

                    <!-- Input Username -->
                    <div class="mb-8 neon-border bg-black/50 backdrop-blur-sm rounded-lg p-6" id="username-section">
                        <label for="usernameInput" class="block mb-3 pixel-font text-sm text-blue-300 text-center">
                            ENTER YOUR USERNAME:
                        </label>
                        <input 
                            type="text" 
                            name="username" 
                            id="usernameInput" 
                            value="Anon"
                            maxlength="20"
                            class="w-full p-3 rounded pixel-font text-center text-lg neon-input"
                            placeholder="Your username..."
                        />
                    </div>

                    <!-- Cartes de tournois -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="tournament-cards">
						<!-- 4 Players -->
						<div 
							class="tournament-card neon-border rounded-lg p-8 relative flex flex-col items-center"
							data-component="joinTournament"
							data-slots="4"
							data-tournament-id=""
							id="tournament-4"
						>
							<!-- Badge de statut -->
							<div class="absolute top-4 right-4 pixel-font text-xs text-green-400 bg-green-500/20 px-3 py-1 rounded border border-green-500/50">
								OPEN
							</div>

							<!-- Icône -->
							<div class="text-6xl md:text-7xl mb-6 text-blue-500">
								⚡
							</div>
							
							<!-- Titre -->
							<h3 class="pixel-font text-4xl text-blue-400 mb-2">
								4
							</h3>
							<p class="pixel-font text-sm text-blue-300 mb-6 opacity-80">
								PLAYERS
							</p>
							
							<!-- Compteur -->
							<div class="mb-6">
								<span class="pixel-font text-3xl text-yellow-400" data-player-count>0/4</span>
							</div>

							<!-- Description -->
							<p class="pixel-font text-xs text-blue-300/60 text-center mb-8">
								Quick bracket - 2 rounds
							</p>

							<!-- Flèches décoratives symétriques -->
							<div class="absolute bottom-4 left-0 right-0 flex justify-between px-4">
								<span class="text-red-500 text-2xl opacity-50">←</span>
								<span class="text-red-500 text-2xl opacity-50">→</span>
							</div>
						</div>

						<!-- 8 Players -->
						<div 
							class="tournament-card neon-border rounded-lg p-8 relative flex flex-col items-center"
							data-component="joinTournament"
							data-slots="8"
							data-tournament-id=""
							id="tournament-8"
						>
							<!-- Badge de statut -->
							<div class="absolute top-4 right-4 pixel-font text-xs text-green-400 bg-green-500/20 px-3 py-1 rounded border border-green-500/50">
								OPEN
							</div>

							<!-- Icône -->
							<div class="text-6xl md:text-7xl mb-6 text-blue-500">
								⚡
							</div>
							
							<!-- Titre -->
							<h3 class="pixel-font text-4xl text-blue-400 mb-2">
								8
							</h3>
							<p class="pixel-font text-sm text-blue-300 mb-6 opacity-80">
								PLAYERS
							</p>
							
							<!-- Compteur -->
							<div class="mb-6">
								<span class="pixel-font text-3xl text-yellow-400" data-player-count>0/8</span>
							</div>

							<!-- Description -->
							<p class="pixel-font text-xs text-blue-300/60 text-center mb-8">
								Standard bracket - 3 rounds
							</p>

							<!-- Flèches décoratives symétriques -->
							<div class="absolute bottom-4 left-0 right-0 flex justify-between px-4">
								<span class="text-blue-500 text-2xl opacity-80">←</span>
								<span class="text-blue-500 text-2xl opacity-80">→</span>
							</div>
						</div>

						<!-- 16 Players -->
						<div 
							class="tournament-card neon-border rounded-lg p-8 relative flex flex-col items-center"
							data-component="joinTournament"
							data-slots="16"
							data-tournament-id=""
							id="tournament-16"
						>
							<!-- Badge de statut -->
							<div class="absolute top-4 right-4 pixel-font text-xs text-green-400 bg-green-500/20 px-3 py-1 rounded border border-green-500/50">
								OPEN
							</div>

							<!-- Icône -->
							<div class="text-6xl md:text-7xl mb-6 text-blue-500">
								⚡
							</div>
							
							<!-- Titre -->
							<h3 class="pixel-font text-4xl text-blue-400 mb-2">
								16
							</h3>
							<p class="pixel-font text-sm text-blue-300 mb-6 opacity-80">
								PLAYERS
							</p>
							
							<!-- Compteur -->
							<div class="mb-6">
								<span class="pixel-font text-3xl text-yellow-400" data-player-count>0/16</span>
							</div>

							<!-- Description -->
							<p class="pixel-font text-xs text-blue-300/60 text-center mb-8">
								Epic bracket - 4 rounds
							</p>

							<!-- Flèches décoratives symétriques -->
							<div class="absolute bottom-4 left-0 right-0 flex justify-between px-4">
								<span class="text-red-500 text-2xl opacity-50">←</span>
								<span class="text-red-500 text-2xl opacity-50">→</span>
							</div>
						</div>
					</div>


                </div>
            </div>

		<!-- Modal de countdown (caché par défaut) -->
        <div id="countdown" class="fixed inset-0 bg-black/80 countdown-modal hidden flex items-center justify-center z-50">
            <div class="neon-border bg-black/90 backdrop-blur-sm rounded-lg p-12 text-center">
                <h2 class="pixel-font text-3xl text-blue-400 mb-6">
                    TOURNAMENT IS STARTING...
                </h2>
                <div id="countdown-text" class="pixel-font text-8xl text-pink-500 mb-4" style="animation: neonPulse 1s ease-in-out infinite;">
                    3
                </div>
                <p class="pixel-font text-sm text-blue-300/60">
                    Get ready for battle!
                </p>
            </div>
        </div>
    `;

    return Layout.render(content, {
        showBackButton: true,
        showSignInButton: true,
        showFooter: true
    });
};

export const tournamentLogic = (): CleanupFunction => {
    console.log('🎮 TournamentView: Initializing...');

	const cleanupManager = createCleanupManager();
    const tournamentBtns = document.querySelectorAll('[data-component="joinTournament"]');
    const usernameInput = document.getElementById("usernameInput") as HTMLInputElement;

    let pollInterval: number | null = null;
    let currentTournamentId: string | null = null;
    let countdownInterval: number | null = null;

    // ✅ Forcer les pointer-events sur les cartes IMMÉDIATEMENT
    tournamentBtns.forEach(btn => {
        (btn as HTMLElement).style.pointerEvents = 'auto';
        (btn as HTMLElement).style.cursor = 'pointer';
        (btn as HTMLElement).style.position = 'relative';
        (btn as HTMLElement).style.zIndex = '10';
    });

	// Enregistrer les cibles GSAP pour cleanup
	cleanupManager.registerGsapTarget('#tournament-title');
	cleanupManager.registerGsapTarget('#username-section');
	cleanupManager.registerGsapTarget('.tournament-card');

    // Animations d'entrée
    gsap.fromTo('#tournament-title',
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.7)' }
    );

    gsap.fromTo('#username-section',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.3, ease: 'power2.out' }
    );

    gsap.fromTo('.tournament-card',
        { y: 100, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.2,
            delay: 0.5,
            ease: 'power3.out',
            onComplete: () => {
                // ✅ Re-forcer après animation
                tournamentBtns.forEach(btn => {
                    (btn as HTMLElement).style.pointerEvents = 'auto';
                    (btn as HTMLElement).style.cursor = 'pointer';
                });
            }
        }
    );

    // ✅ Fonction pour nettoyer tous les intervals
    const cleanupIntervals = () => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('🧹 Polling interval cleared');
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            console.log('🧹 Countdown interval cleared');
        }
    };

    // Fonction pour récupérer et mettre à jour les tournois
    const fetchTournaments = async () => {
        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/tournamentback/tournaments`);
            const data = await response.json();

            if (data.success) {
                tournamentBtns.forEach(btn => {
                    const countSpan = btn.querySelector("[data-player-count]");
                    const badge = btn.querySelector('.absolute.top-3.right-3');
                    const slots = btn.getAttribute('data-slots');
                    
                    data.registrations.forEach((tournament: any) => {
                        if (tournament.name === slots + 'p') {
                            if (countSpan) {
                                countSpan.textContent = `${tournament.currentPlayerCount}/${slots}`;
                            }
                            btn.setAttribute("data-tournament-id", tournament.id);
                            
                            // Désactiver si plein
                            if (tournament.currentPlayerCount >= parseInt(slots || '0')) {
                                btn.classList.add('disabled');
                                (btn as HTMLElement).style.cursor = 'not-allowed';
                                if (badge) {
                                    badge.textContent = 'FULL';
                                    badge.classList.remove('bg-green-500/20', 'border-green-500/50', 'text-green-400');
                                    badge.classList.add('bg-red-500/20', 'border-red-500/50', 'text-red-400');
                                }
                            } else {
                                btn.classList.remove('disabled');
                                (btn as HTMLElement).style.cursor = 'pointer';
                                (btn as HTMLElement).style.pointerEvents = 'auto';
                                if (badge) {
                                    badge.textContent = 'OPEN';
                                    badge.classList.remove('bg-red-500/20', 'border-red-500/50', 'text-red-400');
                                    badge.classList.add('bg-green-500/20', 'border-green-500/50', 'text-green-400');
                                }
                            }
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Error fetching tournaments:', err);
        }
    };

    // Polling pour vérifier si le tournoi a démarré
    const startPollingForStart = (tournamentId: string) => {
        // ✅ Nettoyer l'ancien polling avant d'en créer un nouveau
        if (pollInterval) {
            clearInterval(pollInterval);
        }

        pollInterval = setInterval(async () => {
            try {
                const host = import.meta.env.VITE_HOST || 'localhost:8443';
                const response = await fetch(`https://${host}/tournamentback/tournaments/${tournamentId}`);
                const data = await response.json();

                if (data.success && data.tournament.status === 'in_progress') {
                    cleanupIntervals(); // ✅ Nettoyer avant de continuer
                    startCountdownAndRedirect(tournamentId);
                }
            } catch (err) {
                console.error('Error polling tournament status:', err);
            }
        }, 1000);
        
        console.log('🔄 Started polling for tournament start');
    };

    // Countdown avant redirection
    const startCountdownAndRedirect = (tournamentId: string): void => {
        const countdownModal = document.getElementById('countdown');
        const countdownText = document.getElementById('countdown-text');
        
        if (!countdownModal || !countdownText) return;

        let count = 3;
        countdownModal.classList.remove('hidden');
        countdownModal.classList.add('flex');
        countdownText.textContent = count.toString();

        // Animation du modal
        gsap.from(countdownModal.querySelector('.neon-border'), {
            scale: 0.5,
            opacity: 0,
            duration: 0.5,
            ease: 'back.out(1.7)'
        });

        // ✅ Nettoyer l'ancien countdown avant d'en créer un nouveau
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownText.textContent = count.toString();
                // Animation du chiffre
                gsap.fromTo(countdownText, 
                    { scale: 1.5, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out' }
                );
            } else {
                cleanupIntervals(); // ✅ Nettoyer avant redirect
                countdownModal.classList.add('hidden');
                countdownModal.classList.remove('flex');
                window.router.navigate(`/tournament/${tournamentId}`);
            }
        }, 1000);
        
        console.log('⏱️ Countdown started');
    };

    // Fonction pour rejoindre un tournoi
    const handleJoinTournament = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎯 Tournament card clicked!');
        
        const target = e.currentTarget as HTMLElement;
        
        // Vérifier si le tournoi est plein
        if (target.classList.contains('disabled')) {
            console.log('❌ Tournament is full');
            return;
        }

        const username = usernameInput.value.trim() || 'Anon';
        window.simpleAuth.setUsername(username);
        
        const tournamentId = target.getAttribute('data-tournament-id');

        if (!tournamentId) {
            console.error('No tournament ID found');
            return;
        }

        currentTournamentId = tournamentId;

        // Animation du clic
        gsap.to(target, {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });

        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const playerId = window.simpleAuth.getPlayerId();
            
            const response = await fetch(`https://${host}/tournamentback/tournaments/${tournamentId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, playerId })
            });

            const data = await response.json();

            if (data.success) {
                if (data.tournamentStarted) {
                    // Le tournoi démarre immédiatement
                    startCountdownAndRedirect(data.tournamentId);
                } else {
                    // En attente d'autres joueurs
                    console.log(`✅ Joined tournament: ${data.currentPlayers}/${data.maxPlayers} players`);
                    startPollingForStart(tournamentId);
                }
            } else {
                alert(data.error || 'Failed to join tournament');
            }
        } catch (err) {
            console.error('Error joining tournament:', err);
            alert('Failed to join tournament');
        }
    };

    // ✅ Stocker les handlers pour pouvoir les retirer
    const handlers = new Map<Element, EventListener>();

    // Attacher les event listeners
    tournamentBtns.forEach(tournamentBtn => {
        const handler = handleJoinTournament as EventListener;
        tournamentBtn.addEventListener("click", handler, { capture: true });
        handlers.set(tournamentBtn, handler);
    });

    // Polling initial et régulier pour les stats
    fetchTournaments();
    const updateInterval = setInterval(fetchTournaments, 2000);
    console.log('🔄 Started tournament stats polling');

	// Enregistrer les cleanups existants
	cleanupManager.onCleanup(() => {
		cleanupIntervals();
		if (updateInterval) {
			clearInterval(updateInterval);
			console.log('🧹 Update interval cleared');
		}
		handlers.forEach((handler, element) => {
			element.removeEventListener("click", handler, { capture: true });
		});
		handlers.clear();
	});

    // ✅ FONCTION DE CLEANUP COMPLÈTE
    return (): void => {
        console.log('🧹 TournamentView: Cleaning up...');
		cleanupManager.cleanup();
        console.log('🧹 Event listeners removed');

        // 3. Se désinscrire du tournoi si on quitte la page
        if (currentTournamentId) {
            const playerId = window.simpleAuth.getPlayerId();
            if (playerId) {
                const host = import.meta.env.VITE_HOST || 'localhost:8443';
                fetch(`https://${host}/tournamentback/tournaments/leave/${playerId}`, {
                    method: 'DELETE'
                }).catch(err => console.error('Error leaving tournament:', err));
                console.log('🚪 Left tournament');
            }
        }

        console.log('✅ TournamentView: Cleanup complete');
    };
};
