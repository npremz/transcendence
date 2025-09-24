import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";

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
					<button 
						id="connect-btn" 
						class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						Se connecter
					</button>
					<button 
						id="disconnect-btn" 
						class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
					>
						Se déconnecter
					</button>
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
					<button 
						id="player-ready-btn" 
						class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
					>
						Je suis prêt
					</button>
					<button 
						id="send-input-btn" 
						class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
					>
						Envoyer Input Test
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

export const initWebSocket = (): (() => void) => {
	let ws: WebSocket | null = null;
	let roomId: string | null = null;
	let playerNumber: string | null = null;

	// Références aux éléments DOM
	const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
	const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
	const joinQuickplayBtn = document.getElementById('join-quickplay-btn') as HTMLButtonElement;
	const playerReadyBtn = document.getElementById('player-ready-btn') as HTMLButtonElement;
	const sendInputBtn = document.getElementById('send-input-btn') as HTMLButtonElement;

	// === EVENT LISTENERS ===
	
	const handleConnect = (): void => {
		if (ws) {
			addMessage('Déjà connecté!', 'error');
			return;
		}

		ws = new WebSocket(`wss://${import.meta.env.VITE_HOST}${import.meta.env.VITE_QUICK_ENDPOINT}`);
		
		ws.onopen = function() {
			addMessage('Connecté au serveur!', 'success');
			updateStatus('Connecté', 'connected');
		};
		
		ws.onmessage = function(event) {
			const message = JSON.parse(event.data);
			handleServerMessage(message);
		};
		
		ws.onclose = function() {
			addMessage('Connexion fermée', 'error');
			updateStatus('Déconnecté', 'error');
			ws = null;
			roomId = null;
			playerNumber = null;
			updateDebugInfo();
		};
		
		ws.onerror = function(error) {
			addMessage('Erreur WebSocket: ' + error, 'error');
		};
	};

	const handleDisconnect = (): void => {
		if (ws) {
			ws.close();
		}
	};

	const handleJoinQuickplay = (): void => {
		if (!ws) {
			addMessage('Pas connecté!', 'error');
			return;
		}
		
		const usernameInput = document.getElementById('username') as HTMLInputElement;
		const username = usernameInput.value || 'TestPlayer';
		const message = {
			type: 'join_quickplay',
			username: username
		};
		
		ws.send(JSON.stringify(message));
		addMessage('Demande de quickplay envoyée...', 'info');
	};

	const handlePlayerReady = (): void => {
		if (!ws) {
			addMessage('Pas connecté!', 'error');
			return;
		}
		
		ws.send(JSON.stringify({ type: 'player_ready' }));
		addMessage('Signal "prêt" envoyé', 'info');
	};

	const handleSendInput = (): void => {
		if (!ws) {
			addMessage('Pas connecté!', 'error');
			return;
		}
		
		ws.send(JSON.stringify({ 
			type: 'player_input', 
			input: { action: 'move', direction: 'up' }
		}));
		addMessage('Input test envoyé', 'info');
	};

	// Attacher les event listeners
	connectBtn?.addEventListener('click', handleConnect);
	disconnectBtn?.addEventListener('click', handleDisconnect);
	joinQuickplayBtn?.addEventListener('click', handleJoinQuickplay);
	playerReadyBtn?.addEventListener('click', handlePlayerReady);
	sendInputBtn?.addEventListener('click', handleSendInput);

	// === FONCTIONS UTILITAIRES ===

	function handleServerMessage(message: any): void {
		addMessage('Reçu: ' + JSON.stringify(message), 'server');
		
		switch(message.type) {
			case 'waiting_for_opponent':
				updateStatus('En attente d\'un adversaire...', 'waiting');
				break;
				
			case 'game_start':
				roomId = message.roomId;
				playerNumber = message.playerNumber;
				updateStatus(`Partie démarrée! Vous êtes le joueur ${playerNumber}`, 'playing');
				updateDebugInfo();
				console.log(window.router)
				window.router.navigate(`/game/${roomId}`)
				break;
				
			case 'opponent_disconnected':
				updateStatus('Adversaire déconnecté', 'waiting');
				break;
				
			case 'error':
				updateStatus('Erreur: ' + message.message, 'error');
				break;
		}
	}

	function addMessage(text: string, type: string): void {
		const messages = document.getElementById('messages');
		if (!messages) return;

		const time = new Date().toLocaleTimeString();
		const div = document.createElement('div');
		div.innerHTML = `<strong class="text-gray-600">[${time}]</strong> ${text}`;
		
		// Couleurs selon le type avec Tailwind
		switch(type) {
			case 'error':
				div.className = 'text-red-600 mb-1';
				break;
			case 'server':
				div.className = 'text-blue-600 mb-1';
				break;
			case 'success':
				div.className = 'text-green-600 mb-1';
				break;
			case 'info':
			default:
				div.className = 'text-gray-800 mb-1';
				break;
		}
		
		messages.appendChild(div);
		messages.scrollTop = messages.scrollHeight;
	}

	function updateStatus(text: string, type: string): void {
		const status = document.getElementById('connection-status');
		if (!status) return;

		status.textContent = text;
		
		// Classes Tailwind selon le statut
		switch(type) {
			case 'connected':
				status.className = 'p-4 mb-4 rounded-lg border bg-blue-100 text-blue-800 border-blue-300';
				break;
			case 'waiting':
				status.className = 'p-4 mb-4 rounded-lg border bg-yellow-100 text-yellow-800 border-yellow-300';
				break;
			case 'playing':
				status.className = 'p-4 mb-4 rounded-lg border bg-green-100 text-green-800 border-green-300';
				break;
			case 'error':
				status.className = 'p-4 mb-4 rounded-lg border bg-red-100 text-red-800 border-red-300';
				break;
			default:
				status.className = 'p-4 mb-4 rounded-lg border bg-gray-100 text-gray-800';
				break;
		}
	}

	function updateDebugInfo(): void {
		const roomIdElement = document.getElementById('room-id');
		const playerNumberElement = document.getElementById('player-number');
		
		if (roomIdElement) roomIdElement.textContent = roomId || '-';
		if (playerNumberElement) playerNumberElement.textContent = playerNumber || '-';
	}

	// === FONCTION DE CLEANUP ===
	return (): void => {
		console.log('Nettoyage du WebSocket test...');
		
		// Fermer la connexion WebSocket
		if (ws) {
			ws.close();
			ws = null;
		}
		
		// Retirer tous les event listeners
		connectBtn?.removeEventListener('click', handleConnect);
		disconnectBtn?.removeEventListener('click', handleDisconnect);
		joinQuickplayBtn?.removeEventListener('click', handleJoinQuickplay);
		playerReadyBtn?.removeEventListener('click', handlePlayerReady);
		sendInputBtn?.removeEventListener('click', handleSendInput);
		
		// Reset des variables
		roomId = null;
		playerNumber = null;
	};
};
