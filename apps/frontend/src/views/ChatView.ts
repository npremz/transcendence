import type { ViewFunction } from "../router/types";
import { v4 as uuidv4 } from "uuid";

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
	const MODAL_ID = 'chat-duel-modal';

	const showModal = (title: string, message: string, confirmText: string, cancelText: string, onConfirm: () => void, onCancel?: () => void) => {
		let existing = document.getElementById(MODAL_ID);
		if (existing) existing.remove();

		const overlay = document.createElement('div');
		overlay.id = MODAL_ID;
		overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4';
		overlay.innerHTML = `
			<div class="max-w-md w-full neon-border bg-gray-900 rounded-lg p-6 space-y-4">
				<h3 class="pixel-font text-xl text-blue-200">${title}</h3>
				<p class="pixel-font text-sm text-blue-100 leading-relaxed">${message}</p>
				<div class="flex justify-end gap-3">
					<button data-modal-cancel class="pixel-font px-4 py-2 bg-gray-700 text-blue-200 rounded border border-blue-500/30 hover:bg-gray-600 transition">${cancelText}</button>
					<button data-modal-confirm class="pixel-font px-4 py-2 bg-blue-600 text-white rounded border border-blue-500/50 hover:bg-blue-500 transition">${confirmText}</button>
				</div>
			</div>
		`;

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
				onCancel?.();
			}
		});

		const cancelBtn = overlay.querySelector('[data-modal-cancel]') as HTMLButtonElement | null;
		const confirmBtn = overlay.querySelector('[data-modal-confirm]') as HTMLButtonElement | null;

		if (cancelBtn) cancelBtn.onclick = () => { overlay.remove(); onCancel?.(); };
		if (confirmBtn) confirmBtn.onclick = () => { overlay.remove(); onConfirm(); };

		document.body.appendChild(overlay);
	};

	const requestQuickPlayRoom = async (username: string): Promise<string | null> => {
		const playerId = simpleAuth?.getPlayerId?.() || uuidv4();
		const selectedSkill = (sessionStorage.getItem('selectedSkill') as 'smash' | 'dash' | null) || 'smash';

		try {
			const resp = await fetch(`https://${host}/quickplay/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, playerId, selectedSkill })
			});
			const data = await resp.json().catch(() => ({}));
			if (resp.ok && data?.roomId) {
				return data.roomId as string;
			}
			console.warn('[Chat] quickplay join failed', data);
		} catch (err) {
			console.error('[Chat] quickplay join error', err);
		}
		return null;
	};

	const navigateToWaiting = (roomId: string) => {
		sessionStorage.setItem('duelRoomId', roomId);
		if (!sessionStorage.getItem('selectedSkill')) {
			sessionStorage.setItem('selectedSkill', 'smash');
		}
		if (window.router) {
			window.router.navigate('/play/waiting');
		} else {
			window.location.href = '/play/waiting';
		}
	};

	const isSystemInvite = (content: string) => content.startsWith('__DUEL_INVITE__|');
	const isSystemAccept = (content: string) => content.startsWith('__DUEL_ACCEPT__|');

	const handleSystemMessage = (msg: ChatMessage): boolean => {
		// Retourne true si message consommé (pas affiché)
		if (isSystemInvite(msg.content)) {
			const parts = msg.content.split('|');
			// __DUEL_INVITE__ | from | to | roomId
			if (parts.length < 4) return true;
			const [, from, to, roomId] = parts;
			if (to !== authedName) return true;

			showModal(
				'Duel reçu',
				`${from} t'invite en duel. Rejoindre la partie ?`,
				"Rejoindre",
				"Plus tard",
				() => {
					// Rejoindre le quickplay
					requestQuickPlayRoom(authedName).then((joinRoomId) => {
						// Envoyer un ACK au demandeur
						const roomToSend = joinRoomId || roomId || '';
						const ack = `__DUEL_ACCEPT__|${from}|${authedName}|${roomToSend}`;
						void sendChatMessage(authedName, ack, true);
						if (roomToSend) navigateToWaiting(roomToSend);
					});
				},
				() => {}
			);

			return true;
		}

		if (isSystemAccept(msg.content)) {
			const parts = msg.content.split('|');
			// __DUEL_ACCEPT__ | inviter | accepter | roomId
			if (parts.length < 4) return true;
			const [, inviter, accepter, roomId] = parts;
			if (inviter !== authedName) return true;

			showModal(
				'Duel accepté',
				`${accepter} a accepté ton duel. Aller au QuickPlay ?`,
				"Aller",
				"Plus tard",
				() => {
					if (roomId) navigateToWaiting(roomId);
				}
			);

			return true;
		}

		return false;
	};

	const appendMessage = (msg: ChatMessage) => {
		if (handleSystemMessage(msg)) return;
		if (!messagesEl) return;
		const item = document.createElement('div');
		const isSelf = msg.username === authedName;
		item.className = `bg-gray-800/60 rounded px-3 py-2 border ${isSelf ? 'border-green-500/30' : 'border-blue-500/20'}`;
		const dt = new Date(msg.created_at);
		const timeStr = dt.toLocaleTimeString();
		const dateStr = dt.toLocaleDateString();
		item.dataset.username = msg.username;
		item.innerHTML = `
			<div class="flex items-center justify-between gap-2 text-xs text-blue-300/70">
				<button class="underline hover:text-blue-200 transition text-left" data-chat-username="${msg.username}">${msg.username}</button>
				<span class="whitespace-nowrap">${dateStr} • ${timeStr}</span>
			</div>
			<div class="text-sm ${isSelf ? 'text-green-100' : 'text-blue-50'} break-words">${msg.content}</div>
		`;

		const nameBtn = item.querySelector('[data-chat-username]') as HTMLButtonElement | null;
		if (nameBtn) {
			nameBtn.addEventListener('click', (e) => {
				e.preventDefault();
				openUserActions(msg.username, item);
			});
		}

		messagesEl.appendChild(item);
		messagesEl.scrollTop = messagesEl.scrollHeight;
	};

	const sendChatMessage = async (username: string, content: string, silent: boolean = false): Promise<void> => {
		const payload = { username, content };

		try {
			await fetch(`https://${host}/userback/chat/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}).then((resp) => resp.json().catch(() => ({})));

			if (!silent) {
				appendMessage({ username, content, created_at: new Date().toISOString() });
				loadHistory();
			}

			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify(payload));
			}
		} catch (err) {
			console.error('[Chat] send error', err);
		}
	};

	const openUserActions = (username: string, container: HTMLElement) => {
		container.querySelectorAll('.chat-actions').forEach((el) => el.remove());

		const actions = document.createElement('div');
		actions.className = "chat-actions mt-2 flex gap-2";
		if (username === authedName) {
			actions.innerHTML = `<div class="pixel-font text-[11px] text-blue-300/70">Ceci est votre message.</div>`;
			container.appendChild(actions);
			return;
		}

		actions.innerHTML = `
			<button class="px-3 py-1 text-[11px] rounded bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 transition" data-chat-action="friend">+ Ami</button>
			<button class="px-3 py-1 text-[11px] rounded bg-pink-500/20 border border-pink-500/50 hover:bg-pink-500/30 transition" data-chat-action="duel">Duel</button>
		`;

		actions.addEventListener('click', (event) => {
			const target = event.target as HTMLElement | null;
			const action = target?.getAttribute('data-chat-action');
			if (!action) return;
			event.preventDefault();

			if (action === 'friend') {
				alert(`Invitation d'ami envoyée à ${username} (placeholder).`);
			} else if (action === 'duel') {
				void (async () => {
					target.textContent = '...';
					const roomId = await requestQuickPlayRoom(authedName);
					if (!roomId) {
						target.textContent = 'Échec';
						target.classList.add('text-red-300');
						return;
					}
					const duelMsg = `__DUEL_INVITE__|${authedName}|${username}|${roomId}`;
					await sendChatMessage(authedName, duelMsg, true);
					showModal(
						'Duel envoyé',
						`Invitation envoyée à ${username}. Attente de réponse...`,
						'OK',
						'',
						() => {},
						() => {}
					);
					target.textContent = 'Envoyé';
					target.classList.add('opacity-70', 'cursor-not-allowed');
				})();
			}
			actions.remove();
		});

		container.appendChild(actions);
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

		void sendChatMessage(username, content);

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
