import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";
import { SimpleAuth } from "../simpleAuth/SimpleAuth";

export const TestView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })}
		<div class="container mx-auto p-6 max-w-4xl">
			<h1 class="text-3xl font-bold text-gray-800 mb-6">Test Client QuickPlay</h1>
			
			<!-- Status de connexion -->
			<div id="connection-status" class="p-4 mb-4 rounded-lg border bg-gray-100 text-gray-800">
				Non connecté
			</div>
			
			<!-- Contrôles de connexion -->
			<div class="mb-6 p-4 bg-white rounded-lg shadow-sm border">
				<h3 class="text-lg font-semibold mb-3">Connexion</h3>
				<div class="flex flex-wrap gap-3 items-center">
					<input 
						type="text" 
						id="username" 
						placeholder="Nom d'utilisateur" 
						value="TestPlayer"
						class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
				</div>
			</div>
			
			<!-- Contrôles de jeu -->
			<div class="mb-6 p-4 bg-white rounded-lg shadow-sm border">
				<h3 class="text-lg font-semibold mb-3">Actions de jeu</h3>
				<div class="flex flex-wrap gap-3">
					<button 
						id="join-quickplay-btn" 
						class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
					>
						Rejoindre QuickPlay
					</button>
				</div>
			</div>
			
			<!-- Messages reçus -->
			<div class="mb-6">
				<h3 class="text-lg font-semibold mb-3">Messages reçus :</h3>
				<div 
					id="messages" 
					class="h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50 font-mono text-sm"
				></div>
			</div>
			
			<!-- Infos de debug -->
			<div class="p-4 bg-white rounded-lg shadow-sm border">
				<h3 class="text-lg font-semibold mb-3">Infos de debug :</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="flex justify-between">
						<span class="font-medium">Room ID:</span>
						<span id="room-id" class="text-gray-600">-</span>
					</div>
					<div class="flex justify-between">
						<span class="font-medium">Player Number:</span>
						<span id="player-number" class="text-gray-600">-</span>
					</div>
				</div>
			</div>
		</div>
	`;
};

export const quickplayLogic = (): CleanupFunction => {
    let pollInterval: NodeJS.Timeout | null = null;
    let roomId: string | null = null;

    const handleJoin = async () => {
        const username = (document.getElementById('username') as HTMLInputElement).value;
        window.simpleAuth.setUsername(username);
        const playerId = window.simpleAuth.getPlayerId();

		console.log(`Attempting to join quickplay...`)
		console.log(JSON.stringify({ username, playerId }))

        try {
            const response = await fetch('/quickplay/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, playerId })
            });
            const data = await response.json();
            
            if (data.success) {
                roomId = data.roomId;
                startPolling();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const startPolling = () => {
        pollInterval = setInterval(async () => {
            if (!roomId) return;
            
            const response = await fetch(`/quickplay/status/${roomId}`);
            const data = await response.json();
            
            if (data.status === 'ready') {
                // Redirige vers le jeu
                stopPolling();
                sessionStorage.setItem('gameWsURL', data.gameServerURL);
                window.router.navigate(`/game/${roomId}`);
            }
        }, 2000); // Poll toutes les 2s
    };

    const stopPolling = () => {
        if (pollInterval) clearInterval(pollInterval);
    };

    // Attache handleJoin à un bouton
    document.getElementById('join-quickplay-btn')?.addEventListener('click', handleJoin);

    return () => {
        stopPolling();
        document.getElementById('join-quickplay-btn')?.removeEventListener('click', handleJoin);
    };
};
