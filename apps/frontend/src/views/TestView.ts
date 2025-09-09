import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";

export const TestView: ViewFunction = () => {
	return `
	${Header({ isLogged: false })}
	<div id="messages">Connexion en cours...</div>
	`;
};

export const initWebSocket : (() => void | void) = () => {
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

	return () => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.close();
		}
	}
}
