import type { ViewFunction } from "../router/types"
import { Header } from "../components/Header";
import type { RouteParams } from "../router/types";

interface Player
{
	id: string;
	username: string;
	currentTournament?: string;
	isEleminated: boolean;
}

interface Match
{
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

interface Tournament
{
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
		${Header({isLogged: false})}
        <div class="relative container ml-auto mr-auto">
            <div id="tournament-loading" class="text-center p-8">
                <div>Chargement du tournoi...</div>
            </div>
            <div id="tournament-content" style="display: none;">
                <div id="tournament-header" class="mb-6"></div>
                <div id="tournament-brackets"></div>
            </div>
            <div id="tournament-error" style="display: none;" class="text-center p-8 text-red-500">
                <div>Erreur lors du chargement du tournoi</div>
            </div>
        </div>
	`
}

export const bracketLogic = (params: RouteParams | undefined): (() => void) => {
	const tournamentId = params?.id;
	const myPlayerId = window.simpleAuth.getPlayerId();

    const fetchTournamentData = async (): Promise<void> => {
        try
		{
            const host = import.meta.env.VITE_HOST || 'localhost:8443';
            const response = await fetch(`https://${host}/tournamentback/tournaments/${tournamentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok)
			{
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const tournament = data.tournament;
            
            displayTournament(tournament);
            
            checkIfMyTurn(tournament);
        }
		catch (error)
		{
            console.error('Erreur lors de la récupération du tournoi:', error);
            showError();
        }
    };

	const checkIfMyTurn = (tournament: Tournament): void => {
        const myMatch = tournament.bracket.find(match => 
            match.status === 'in_progress' &&
            (match.player1?.id === myPlayerId || match.player2?.id === myPlayerId)
        );

        if (myMatch && myMatch.roomId)
		{
            console.log('Mon match est prêt ! Redirection...');
            
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

        const headerElement = document.getElementById('tournament-header');
        if (headerElement) {
            headerElement.innerHTML = `
                <div class="bg-gray-800 p-4 rounded-lg mb-4">
                    <h2 class="text-2xl font-bold text-white mb-2">Tournoi ${tournament.name}</h2>
                    <div class="text-gray-300">
                        <span class="mr-4">Statut: <span class="text-blue-400">${getStatusText(tournament.status)}</span></span>
                        <span class="mr-4">Round actuel: <span class="text-green-400">${tournament.currentRound}</span></span>
                        ${tournament.winner ? `<span>Gagnant: <span class="text-yellow-400">${tournament.winner.username}</span></span>` : ''}
                    </div>
                </div>
            `;
        }

        const bracketsElement = document.getElementById('tournament-brackets');
        if (bracketsElement) {
            bracketsElement.innerHTML = generateBracketsHTML(tournament.bracket);
        }
		
    };

	const generateBracketsHTML = (matches: Match[]): string => {
        if (matches.length === 0) {
            return '<div class="text-center p-8 text-gray-500">Aucun match disponible</div>';
        }

        const matchesByRound = matches.reduce((acc, match) => {
            if (!acc[match.round]) {
                acc[match.round] = [];
            }
            acc[match.round].push(match);
            return acc;
        }, {} as Record<number, Match[]>);

        let html = '<div class="brackets-container">';
        
        Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
            const roundMatches = matchesByRound[parseInt(round)];
            html += `
                <div class="round mb-8">
                    <h3 class="text-xl font-semibold mb-4 ">Round ${round}</h3>
                    <div class="matches grid gap-4">
            `;
            
            roundMatches.forEach(match => {
                html += generateMatchHTML(match);
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    };

	const generateMatchHTML = (match: Match): string => {
        const getStatusColor = (status: string): string => {
            switch (status) {
                case 'ready': return 'bg-blue-600';
                case 'in_progress': return 'bg-yellow-600';
                case 'finished': return 'bg-green-600';
                default: return 'bg-gray-600';
            }
        };

        return `
            <div class="match bg-gray-800 p-4 rounded-lg border-2 ${match.winner ? 'border-green-500' : 'border-gray-600'}">
                <div class="match-header mb-2">
                    <span class="text-sm ${getStatusColor(match.status)} text-white px-2 py-1 rounded">
                        ${getStatusText(match.status)}
                    </span>
                </div>
                <div class="players">
                    <div class="player ${match.winner?.id === match.player1?.id ? 'winner' : ''} p-2 mb-1 rounded ${match.winner?.id === match.player1?.id ? 'bg-green-700' : 'bg-gray-700'}">
                        <span class="text-white">${match.player1?.username || 'En attente...'}</span>
                        ${match.winner?.id === match.player1?.id ? '<span class="text-yellow-400 ml-2">👑</span>' : ''}
                    </div>
                    <div class="vs text-center text-gray-400 text-sm">VS</div>
                    <div class="player ${match.winner?.id === match.player2?.id ? 'winner' : ''} p-2 mt-1 rounded ${match.winner?.id === match.player2?.id ? 'bg-green-700' : 'bg-gray-700'}">
                        <span class="text-white">${match.player2?.username || 'En attente...'}</span>
                        ${match.winner?.id === match.player2?.id ? '<span class="text-yellow-400 ml-2">👑</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    };

	const getStatusText = (status: string): string => {
        switch (status) {
            case 'registration': return 'Inscription';
            case 'in_progress': return 'En cours';
            case 'finished': return 'Terminé';
            case 'ready': return 'Prêt';
            case 'pending': return 'En attente';
            default: return status;
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

    const pollInterval = setInterval(fetchTournamentData, 2000);

	// === FONCTION DE CLEANUP ===
	return (): void => {
		clearInterval(pollInterval);
	};
};
