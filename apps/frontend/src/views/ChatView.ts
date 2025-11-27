import type { ViewFunction } from "../router/types";

type ChatMessage = {
	username: string;
	content: string;
	created_at: string;
};

export const ChatView: ViewFunction = () => {
	return `
		<div class="min-h-screen bg-black text-blue-100 flex flex-col">
			<header class="flex items-center justify-between px-6 py-4 border-b border-blue-500/40">
				<div class="flex items-center gap-3">
					<div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
					<h1 class="text-xl font-bold tracking-wide">Global Chat</h1>
				</div>
				<button onclick="window.router?.navigate('/')" class="px-4 py-2 border border-blue-500/60 rounded text-blue-300 hover:bg-blue-500/10 transition">
					← Back
				</button>
			</header>

			<main class="flex-1 grid grid-rows-[auto,1fr,auto] gap-4 px-6 py-4">
				<section class="flex items-center gap-4">
					<div class="flex flex-col">
						<label class="text-xs text-blue-300/70">Username (auto)</label>
						<input id="chat-username" class="bg-gray-900 border border-blue-500/40 rounded px-3 py-2 text-sm text-blue-200" placeholder="Player" maxlength="32" readonly />
					</div>
				</section>

				<section class="border border-blue-500/40 rounded-lg overflow-hidden bg-gray-900/60 backdrop-blur">
					<div id="chat-messages" class="h-[60vh] overflow-y-auto px-4 py-3 space-y-3">
					</div>
				</section>

				<form id="chat-form" class="flex gap-3">
					<input id="chat-input" class="flex-1 bg-gray-900 border border-blue-500/40 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="Tape un message..." maxlength="500" autocomplete="off" />
					<button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition">
						Envoyer
					</button>
				</form>
			</main>
		</div>
	`;
};

export const chatLogic = (): (() => void) => {
	const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
	const host = (hostRaw || '').replace(/^https?:\/\//, '').trim();
	const wsUrl = `wss://${host}/userback/chat`;
	const historyUrl = `https://${host}/userback/chat/messages`;

	const messagesEl = document.getElementById('chat-messages');
	const form = document.getElementById('chat-form') as HTMLFormElement | null;
	const input = document.getElementById('chat-input') as HTMLInputElement | null;
	const usernameInput = document.getElementById('chat-username') as HTMLInputElement | null;
	const simpleAuth = (window as any)?.simpleAuth;
	const authedName = simpleAuth?.getUsername?.() || 'Player';
	if (usernameInput) {
		usernameInput.value = authedName;
	}

	let socket: WebSocket | null = null;
	let isConnected = false;

	const appendMessage = (msg: ChatMessage) => {
		if (!messagesEl) return;
		const item = document.createElement('div');
		item.className = "bg-gray-800/60 rounded px-3 py-2 border border-blue-500/20";
		const time = new Date(msg.created_at).toLocaleTimeString();
		item.innerHTML = `
			<div class="text-xs text-blue-300/70">${time} • ${msg.username}</div>
			<div class="text-sm text-blue-50 break-words">${msg.content}</div>
		`;
		messagesEl.appendChild(item);
		messagesEl.scrollTop = messagesEl.scrollHeight;
	};

	const loadHistory = async () => {
		try {
			const resp = await fetch(historyUrl);
			if (!resp.ok) return;
			const data = await resp.json();
			if (!messagesEl) return;
			messagesEl.innerHTML = '';
			(data?.messages || []).forEach((m: ChatMessage) => appendMessage(m));
		} catch (err) {
			console.error('[Chat] history error', err);
		}
	};

	const connect = () => {
		try {
			socket = new WebSocket(wsUrl);
		} catch (err) {
			console.error('[Chat] ws init failed', err);
			return;
		}

		socket.addEventListener('open', () => {
			isConnected = true;
			console.debug('[Chat] websocket connected');
		});

		socket.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data?.username && data?.content) {
					appendMessage(data as ChatMessage);
				}
			} catch (err) {
				console.error('[Chat] ws parse error', err);
			}
		});

		socket.addEventListener('close', () => {
			isConnected = false;
			socket = null;
		});

		socket.addEventListener('error', (err) => {
			isConnected = false;
			console.error('[Chat] websocket error', err);
		});
	};

	const handleSend = (e: Event) => {
		e.preventDefault();
		if (!input || !usernameInput) return;

		const content = input.value.trim();
		const username = (usernameInput?.value || authedName).trim() || 'Player';
		if (!content) return;

		const payload = { username, content };

		// Envoi via HTTP pour persister + broadcast (évite les soucis de WS bloqué)
		fetch(`https://${host}/userback/chat/messages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		}).then((resp) => resp.json().catch(() => ({})))
		.then(() => {
			// Si la websocket n'est pas connectée, on ajoute localement pour feedback
			if (!socket || socket.readyState !== WebSocket.OPEN) {
				appendMessage({ username, content, created_at: new Date().toISOString() });
			}
			// Recharge l'historique pour rafraîchir toutes les fenêtres
			loadHistory();
		}).catch((err) => {
			console.error('[Chat] send error', err);
		});

		// Si WS est connecté, on envoie aussi (optionnel pour temps réel côté serveur)
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(payload));
		}

		input.value = '';
	};

	loadHistory();
	connect();
	const pollId = window.setInterval(loadHistory, 4000);

	if (form) {
		form.addEventListener('submit', handleSend);
	}

	return () => {
		if (form) form.removeEventListener('submit', handleSend);
		if (socket) socket.close();
		if (pollId) window.clearInterval(pollId);
	};
};
