import type { Component } from "./types";
import { gsap } from "gsap";

type ChatMessage = {
    username: string;
    content: string;
    created_at: string;
    type?: 'text' | 'system';
};

export class ChatWidget implements Component {
    private element: HTMLElement;
    private messagesContainer: HTMLElement | null = null;
    private inputElement: HTMLInputElement | null = null;
    private socket: WebSocket | null = null;
    private isOpen: boolean = false;
    private unreadCount: number = 0;
    private badgeElement: HTMLElement | null = null;
    private wsStatusElement: HTMLElement | null = null;
    private auth: any;
    
    // Gestion du polling et des doublons
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private lastMessageTimestamp: number = 0; // Pour ne charger que les nouveaux messages
    private sentMessagesSignature: Set<string> = new Set(); // Pour éviter d'afficher nos propres messages en double

    constructor(element: HTMLElement) {
        this.element = element;
        this.auth = (window as any).simpleAuth;
        this.init();
    }

    private init(): void {
        if (!this.auth || !this.auth.isLoggedIn()) {
            this.renderGuestView();
            return;
        }

        this.renderUserView();
        
        // 1. Charger l'historique initial
        this.loadMessages();
        
        // 2. Connexion WebSocket
        this.connectWebSocket();
        
        // 3. Fallback : Polling toutes les 3s (assure la réception même si WS échoue)
        this.pollInterval = setInterval(() => this.loadMessages(), 3000);
        
        this.setupEventListeners();
    }

    private renderGuestView(): void {
        this.element.innerHTML = ''; 
    }

    private renderUserView(): void {
        this.element.innerHTML = `
            <button id="chat-toggle-btn" class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg neon-border flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer group">
                <span class="text-2xl group-hover:animate-bounce">💬</span>
                <div id="chat-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center hidden pixel-font border border-black">0</div>
            </button>

            <div id="chat-panel" class="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-[#0a0a1f]/95 backdrop-blur-md border border-blue-500/30 rounded-xl shadow-2xl z-50 flex flex-col transform translate-x-[120%] transition-transform duration-300 ease-out">
                
                <div class="flex items-center justify-between p-4 border-b border-blue-500/20 bg-blue-900/20 rounded-t-xl">
                    <div class="flex items-center gap-2">
                        <div id="ws-status-dot" class="w-2 h-2 rounded-full bg-red-500" title="Offline (Polling active)"></div>
                        <h3 class="pixel-font text-sm text-blue-200 tracking-wide">GLOBAL CHAT</h3>
                    </div>
                    <button id="chat-close-btn" class="text-blue-400 hover:text-white transition-colors cursor-pointer text-lg">✕</button>
                </div>

                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
                    <div class="text-center text-xs text-blue-300/40 mt-4 mb-8 pixel-font">
                        — Welcome, ${this.sanitizedUsername()} —
                    </div>
                </div>

                <form id="chat-form" class="p-3 border-t border-blue-500/20 bg-black/40 rounded-b-xl flex gap-2">
                    <input 
                        type="text" 
                        id="chat-input" 
                        class="flex-1 bg-gray-900/80 border border-blue-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400 focus:bg-gray-800 transition-all pixel-font placeholder-blue-300/30"
                        placeholder="Say something..." 
                        maxlength="200" 
                        autocomplete="off"
                    />
                    <button type="submit" id="chat-submit-btn" class="px-4 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg border border-blue-400/50 transition-all cursor-pointer flex items-center justify-center">
                        ➤
                    </button>
                </form>
            </div>
        `;

        this.messagesContainer = this.element.querySelector('#chat-messages');
        this.inputElement = this.element.querySelector('#chat-input');
        this.badgeElement = this.element.querySelector('#chat-badge');
        this.wsStatusElement = this.element.querySelector('#ws-status-dot');
    }

    private sanitizedUsername(): string {
        const user = this.auth.getUsername();
        const div = document.createElement('div');
        div.textContent = user;
        return div.innerHTML;
    }

    private getApiBaseUrl(): string {
        const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
        const host = (hostRaw || '').replace(/^https?:\/\//, '').replace(/^http?:\/\//, '').replace(/\/$/, '').trim();
        const protocol = window.location.protocol; 
        return `${protocol}//${host}`;
    }

    // Fonction unifiée pour traiter les messages entrants (WS ou HTTP)
    private processIncomingMessages(messages: ChatMessage[]) {
        let hasNew = false;

        messages.forEach(msg => {
            const msgDate = new Date(msg.created_at).getTime();
            
            // 1. Ignore si plus vieux que ce qu'on a déjà affiché
            if (msgDate <= this.lastMessageTimestamp) return;

            // 2. Ignore les messages système techniques
            if (msg.content.startsWith('__DUEL_ACCEPT__')) return;

            // 3. Gestion des invitations Duel
            if (msg.content.startsWith('__DUEL_INVITE__')) {
                this.renderInviteMessage(msg);
                this.lastMessageTimestamp = Math.max(this.lastMessageTimestamp, msgDate);
                return;
            }

            // 4. Dédoublonnage pour mes propres messages (envoyés en Optimistic UI)
            // On crée une signature unique pour ce message
            const signature = `${msg.username}:${msg.content}`;
            
            // Si c'est mon message et qu'il est dans la liste des "en attente de confirmation"
            if (msg.username === this.auth.getUsername() && this.sentMessagesSignature.has(signature)) {
                // Le serveur l'a bien reçu, on le retire de la liste d'attente
                // On ne le réaffiche pas pour éviter le saut visuel, on met juste à jour le timestamp
                this.sentMessagesSignature.delete(signature);
                this.lastMessageTimestamp = Math.max(this.lastMessageTimestamp, msgDate);
                return;
            }

            // 5. Affichage normal
            this.renderTextMessage(msg, true);
            this.lastMessageTimestamp = Math.max(this.lastMessageTimestamp, msgDate);
            hasNew = true;
        });

        if (hasNew) {
            this.scrollToBottom();
            if (!this.isOpen) {
                this.unreadCount++;
                this.updateBadge();
            }
        }
    }

    private async loadMessages(): Promise<void> {
        try {
            const url = `${this.getApiBaseUrl()}/userback/chat/messages`;
            const response = await fetch(url);
            if (!response.ok) return;
            
            const data = await response.json();
            if (data.success && Array.isArray(data.messages)) {
                this.processIncomingMessages(data.messages);
            }
        } catch (err) {
            // Silencieux car c'est du polling
        }
    }

    private connectWebSocket(): void {
        const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
        const host = (hostRaw || '').replace(/^https?:\/\//, '').replace(/^http?:\/\//, '').replace(/\/$/, '').trim();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${host}/userback/chat`;

        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.updateConnectionStatus(true);
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Le backend envoie un objet unique { username, content, created_at }
                    if (data.username && data.content) {
                        this.processIncomingMessages([data]);
                    }
                } catch (e) {
                    console.error("[Chat] Parse error", e);
                }
            };

            this.socket.onclose = () => {
                this.updateConnectionStatus(false);
                // Reconnexion lente pour ne pas spammer, car le polling prend le relais
                setTimeout(() => this.connectWebSocket(), 10000);
            };

            this.socket.onerror = () => {
                this.socket?.close();
            };

        } catch (err) {
            console.error("[Chat] Connection failed", err);
        }
    }

    private updateConnectionStatus(connected: boolean): void {
        if (this.wsStatusElement) {
            this.wsStatusElement.className = `w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-yellow-500'}`;
            this.wsStatusElement.setAttribute('title', connected ? 'Live (WebSocket)' : 'Backup Mode (Polling)');
        }
    }

    private async sendMessage(): Promise<void> {
        if (!this.inputElement) return;
        const content = this.inputElement.value.trim();
        if (!content) return;

        if (content.length > 200) {
            alert("Message too long");
            return;
        }

        const username = this.auth.getUsername();
        
        // 1. UI Optimiste : Affichage immédiat
        const tempMsg: ChatMessage = {
            username,
            content,
            created_at: new Date().toISOString()
        };
        
        // On affiche tout de suite
        this.renderTextMessage(tempMsg, true);
        
        // On ajoute la signature dans notre liste "en vol"
        // Cela empêchera le polling/websocket de réafficher ce message quand il reviendra du serveur
        this.sentMessagesSignature.add(`${username}:${content}`);
        
        // On vide l'input tout de suite
        this.inputElement.value = '';
        this.scrollToBottom();

        // 2. Envoi via HTTP POST (Fiabilité)
        try {
            const url = `${this.getApiBaseUrl()}/userback/chat/messages`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, content })
            });
            // Si succès, le message reviendra via polling/ws et sera ignoré grâce à sentMessagesSignature
        } catch (error) {
            console.error("Failed to send message", error);
            // Optionnel : marquer le message comme "échoué" visuellement
        }
    }

    private updateBadge(): void {
        if (!this.badgeElement) return;
        if (this.unreadCount > 0) {
            this.badgeElement.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount.toString();
            this.badgeElement.classList.remove('hidden');
            gsap.fromTo(this.badgeElement, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "elastic.out" });
        } else {
            this.badgeElement.classList.add('hidden');
        }
    }

    private renderTextMessage(msg: ChatMessage, animate: boolean = false): void {
        if (!this.messagesContainer) return;

        const isMe = msg.username === this.auth.getUsername();
        const wrapper = document.createElement('div');
        
        wrapper.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3`;
        
        if (animate) {
            wrapper.classList.add('opacity-0', 'translate-y-2');
        }

        const date = new Date(msg.created_at);
        const timeStr = isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const meta = document.createElement('div');
        meta.className = "flex gap-2 text-[10px] text-blue-300/50 mb-1 pixel-font items-baseline";
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = isMe ? 'YOU' : msg.username;
        nameSpan.className = isMe ? "text-blue-400" : "text-pink-400";
        
        const timeSpan = document.createElement('span');
        timeSpan.textContent = timeStr;
        
        if (isMe) {
            meta.appendChild(timeSpan);
            meta.appendChild(nameSpan);
        } else {
            meta.appendChild(nameSpan);
            meta.appendChild(timeSpan);
        }

        const bubble = document.createElement('div');
        // Protection XSS : textContent utilisé plus bas
        bubble.className = `max-w-[85%] px-3 py-2 rounded-lg text-sm break-words shadow-sm ${
            isMe 
            ? 'bg-blue-600 text-white rounded-tr-none border border-blue-400/50' 
            : 'bg-gray-800 text-blue-100 rounded-tl-none border border-blue-500/20'
        }`;
        
        bubble.textContent = msg.content;

        wrapper.appendChild(meta);
        wrapper.appendChild(bubble);
        this.messagesContainer.appendChild(wrapper);
        
        if (animate) {
            gsap.to(wrapper, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
        }
    }

    private renderInviteMessage(msg: ChatMessage): void {
        if (!this.messagesContainer) return;

        const parts = msg.content.split('|');
        if (parts.length < 4) return;
        
        const [_, from, to, roomId] = parts;
        const myName = this.auth.getUsername();

        if (to !== myName) return;

        const wrapper = document.createElement('div');
        wrapper.className = "mb-4 w-full opacity-0 translate-y-2";

        const card = document.createElement('div');
        card.className = "neon-border bg-black/60 p-4 rounded-lg border border-yellow-500/50 flex flex-col gap-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]";

        const title = document.createElement('div');
        title.className = "flex items-center gap-2 text-yellow-400 pixel-font text-xs tracking-wider";
        title.innerHTML = `<span class="animate-pulse">⚔️</span> <span>DUEL REQUEST</span>`; 

        const text = document.createElement('p');
        text.className = "text-sm text-white font-medium";
        text.textContent = `${from} challenges you!`;

        const actions = document.createElement('div');
        actions.className = "flex gap-2 mt-1";

        const acceptBtn = document.createElement('button');
        acceptBtn.className = "flex-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded pixel-font transition-all transform active:scale-95 shadow-lg shadow-green-900/50 cursor-pointer";
        acceptBtn.textContent = "ACCEPT";
        acceptBtn.onclick = () => {
            this.acceptDuel(from, roomId);
            wrapper.remove();
        };

        const declineBtn = document.createElement('button');
        declineBtn.className = "px-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded pixel-font transition-colors border border-red-500/30 cursor-pointer";
        declineBtn.textContent = "✕";
        declineBtn.onclick = () => {
            gsap.to(wrapper, { height: 0, opacity: 0, duration: 0.3, onComplete: () => wrapper.remove() });
        };

        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);

        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(actions);
        wrapper.appendChild(card);

        this.messagesContainer.appendChild(wrapper);
        this.scrollToBottom();
        
        gsap.to(wrapper, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" });
    }

    private acceptDuel(opponent: string, roomId: string): void {
        const myName = this.auth.getUsername();
        const ack = `__DUEL_ACCEPT__|${opponent}|${myName}|${roomId}`;
        
        const url = `${this.getApiBaseUrl()}/userback/chat/messages`;
        fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: myName, content: ack })
        }).catch(err => console.error(err));

        sessionStorage.setItem('gameWsURL', `wss://${window.location.hostname}:8443/gameback/game/${roomId}`);
        if (window.router) {
            window.router.navigate(`/game/${roomId}`);
        }
    }

    private setupEventListeners(): void {
        const toggleBtn = this.element.querySelector('#chat-toggle-btn');
        const closeBtn = this.element.querySelector('#chat-close-btn');
        const form = this.element.querySelector('#chat-form');
        const panel = this.element.querySelector('#chat-panel');

        const toggleChat = () => {
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                panel?.classList.remove('translate-x-[120%]');
                panel?.classList.add('translate-x-0');
                this.unreadCount = 0;
                this.updateBadge();
                setTimeout(() => this.inputElement?.focus(), 100);
                this.scrollToBottom();
            } else {
                panel?.classList.add('translate-x-[120%]');
                panel?.classList.remove('translate-x-0');
            }
        };

        toggleBtn?.addEventListener('click', toggleChat);
        closeBtn?.addEventListener('click', toggleChat);

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    cleanup(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}
