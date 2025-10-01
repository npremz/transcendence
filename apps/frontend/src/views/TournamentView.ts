import type { ViewFunction } from "../router/types"
import { Header } from "../components/Header";
import { JoinTournament } from "../components/JoinTournament";

export const TournamentView: ViewFunction = () => {
    return `
        ${Header({isLogged: false})}
        <div class="relative">
            <div class="mt-16 flex flex-col gap-4 items-center">
                <input type="text" name="username" id="usernameInput" value="Anon"
                    class="px-8 py-4 border-b-cyan-300 border-2 rounded-xl"/>
                ${JoinTournament({slots: 4})}
                ${JoinTournament({slots: 8})}
                ${JoinTournament({slots: 16})}
            </div>
            <div id="countdown" style="display: none;" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 text-white bg-gray-950 rounded-xl z-50">
                <h2>Tournament is starting...</h2>
                <div id="countdown-text" class="text-center text-4xl py-4">3</div>
            </div>
        </div>
    `
}

export const tournamentLogic = (): (() => void) => {
    const tournamentBtns = document.querySelectorAll('[data-component="joinTournament"]')
    const usernameInput = document.getElementById("usernameInput") as HTMLInputElement;
    
    let pollInterval: NodeJS.Timeout | null = null;
    let currentTournamentId: string | null = null;

    // Fonction pour récupérer et mettre à jour les tournois
    const fetchTournaments = async () => {
        try {
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/tournamentback/tournaments`);
            const data = await response.json();

            if (data.success) {
                tournamentBtns.forEach(btn => {
                    const span: HTMLSpanElement | null = btn.querySelector("span");
                    const slots = btn.getAttribute('data-slots');
                    
                    data.registrations.forEach((tournament: any) => {
                        if (tournament.name === slots + 'p') {
                            span!.innerText = `${tournament.currentPlayerCount}/${slots}`;
                            btn.setAttribute("data-tournament-id", tournament.id);
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Error fetching tournaments:', err);
        }
    };

    // Polling initial et régulier
    fetchTournaments();
    const updateInterval = setInterval(fetchTournaments, 2000);

    // Fonction pour rejoindre un tournoi
    const handleJoinTournament = async (e: Event) => {
        const username = usernameInput.value;
        const target = e.target as HTMLElement;
        const tournamentId = target?.getAttribute('data-tournament-id');

        if (!tournamentId) {
            console.error('No tournament ID found');
            return;
        }

        currentTournamentId = tournamentId;

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
                    // Le tournoi démarre !
                    startCountdownAndRedirect(data.tournamentId);
                } else {
                    // En attente d'autres joueurs
                    console.log(`Joined tournament: ${data.currentPlayers}/${data.maxPlayers} players`);
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

    // Polling pour vérifier si le tournoi a démarré
    const startPollingForStart = (tournamentId: string) => {
        if (pollInterval) return; // Déjà en cours

        pollInterval = setInterval(async () => {
            try {
                const host = import.meta.env.VITE_HOST || 'localhost:8443';
                const response = await fetch(`https://${host}/tournamentback/tournaments/${tournamentId}`);
                const data = await response.json();

                if (data.success && data.tournament.status === 'in_progress') {
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                    }
                    startCountdownAndRedirect(tournamentId);
                }
            } catch (err) {
                console.error('Error polling tournament status:', err);
            }
        }, 1000); // Check every second
    };

    // Countdown avant redirection
    const startCountdownAndRedirect = (tournamentId: string): void => {
        const countdownModal = document.getElementById('countdown');
        const countdownText = document.getElementById('countdown-text');
        
        if (!countdownModal || !countdownText) return;

        let count = 3;
        countdownModal.style.display = 'block';
        countdownText.textContent = count.toString();

        const countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownText.textContent = count.toString();
            } else {
                clearInterval(countdownInterval);
                countdownModal.style.display = 'none';
                window.location.href = `/tournament/${tournamentId}`;
            }
        }, 1000);
    };

    // Attacher les event listeners
    tournamentBtns.forEach(tournamentBtn => {
        tournamentBtn.addEventListener("click", handleJoinTournament);
    });

    // Fonction de cleanup
    return (): void => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        tournamentBtns.forEach(tournamentBtn => {
            tournamentBtn.removeEventListener("click", handleJoinTournament);
        });

        // Se désinscrire du tournoi si on quitte la page
        if (currentTournamentId) {
            const playerId = window.simpleAuth.getPlayerId();
            if (playerId) {
                const host = import.meta.env.VITE_HOST || 'localhost:8443';
                fetch(`https://${host}/tournamentback/tournaments/leave/${playerId}`, {
                    method: 'DELETE'
                }).catch(err => console.error('Error leaving tournament:', err));
            }
        }
    };
};
