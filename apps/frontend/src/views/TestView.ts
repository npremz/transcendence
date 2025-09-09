import type { ViewFunction } from "../router/types";

export const TestView: ViewFunction = () => {
	return `<div id="messages">Connexion en cours...</div>`;
};

export const initWebSocket = () => {
	const wsUrl = import.meta.env.GAMEBACK_WS_URL
					|| 'wss://localhost:8443/gameback/ws';
	const ws = new WebSocket(wsUrl);
	const messagesDiv = document.getElementById('messages');
	
	ws.onopen = () => {
		ws.send('hi from client');
		messagesDiv!.innerHTML = 'Connecté !';
	};
	
	ws.onmessage = (event) => {
		messagesDiv!.innerHTML += '<p>' + event.data + '</p>';
	};
	
	ws.onerror = () => {
		messagesDiv!.innerHTML = 'Erreur de connexion';
	};
}
