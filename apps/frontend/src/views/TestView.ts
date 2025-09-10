import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";

export const TestView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })}
		<div class="container ml-auto mr-auto mt-8">
			<h2 id="status" class="text-3xl">Connexion en cours...</h2>
			<div id="chatHistory" class="mt-4"></div>
			<input type="text" id="chatInput" name="chatInput"
				placeholder="Tapez votre message..."
				class="border-2 rounded-md p-4 w-full mt-4" />
		</div>
	`;
};

export const initWebSocket : (() => void | void) = () => {
	const wsUrl = import.meta.env.GAMEBACK_WS_URL
					|| 'wss://localhost:8443/gameback/chat';
	const ws = new WebSocket(wsUrl);
	const statusElem = document.getElementById('status');
	const chatHistory = document.getElementById('chatHistory') as HTMLDivElement
	const chatInput = document.getElementById('chatInput') as HTMLInputElement
	
	const sendMessage = (msg: string): void => {
		const trimedMsg = msg.trim();
		if (ws && trimedMsg)
		{
			ws.send(trimedMsg)
		}
	}

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (e.key === 'Enter' && !e.shiftKey)
		{
			e.preventDefault();
			const msg = chatInput.value;
			sendMessage(msg);
			chatInput.value = ''
		}
	}

	ws.onopen = () => {
		ws.send('hi from client');
		statusElem!.innerHTML = 'Connecté au chat!';
	};
	
	ws.onmessage = (event) => {
		chatHistory!.innerHTML += '<p>' + event.data + '</p>';
	};
	
	ws.onerror = () => {
		statusElem!.innerHTML = 'Erreur de connexion';
	};

	chatInput?.addEventListener("keydown", handleKeyDown)

	return () => {
		chatInput.removeEventListener('keydown', handleKeyDown)
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.close();
		}
	}
}
