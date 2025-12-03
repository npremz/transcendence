import type { Component } from "./types";
import { gsap } from "gsap";
import { v4 as uuidv4 } from "uuid"; // Nécessaire pour générer un ID joueur temporaire si besoin

type ChatMessage = {
    username: string;
    content: string;
    avatar?: string;
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
    private pendingMessages: Set<string> = new Set();
    private sentMessagesSignature: Set<string> = new Set();
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private lastMessageTimestamp: number = 0;

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
        this.loadMessages();
        this.connectWebSocket();
        this.pollInterval = setInterval(() => this.loadMessages(), 3000);
        this.setupEventListeners();
    }

    private renderGuestView(): void {
        this.element.innerHTML = ''; 
    }

    private renderUserView(): void {
        this.element.innerHTML = `
            <button id="chat-toggle-btn" class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg neon-border flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer group">
                <img src="${this.getAvatar({username: this.auth.getUsername()})}" class="w-full h-full rounded-full object-cover p-0.5" />
                <div id="chat-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center hidden pixel-font border border-black">0</div>
            </button>

            <div id="chat-panel" class="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-[#0a0a1f]/95 backdrop-blur-md border border-blue-500/30 rounded-xl shadow-2xl z-50 flex flex-col transform translate-x-[120%] transition-transform duration-300 ease-out overflow-hidden">
                
                <div class="flex items-center justify-between p-4 border-b border-blue-500/20 bg-blue-900/20 rounded-t-xl relative z-20">
                    <div class="flex items-center gap-2">
                        <div id="ws-status-dot" class="w-2 h-2 rounded-full bg-red-500" title="Offline (Polling active)"></div>
                        <h3 class="pixel-font text-sm text-blue-200 tracking-wide">GLOBAL CHAT</h3>
                    </div>
                    <button id="chat-close-btn" class="text-blue-400 hover:text-white transition-colors cursor-pointer text-lg">✕</button>
                </div>

                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent relative z-10">
                    <div class="text-center text-xs text-blue-300/40 mt-4 mb-8 pixel-font">
                        — Welcome, ${this.sanitizedUsername()} —
                    </div>
                </div>

                <div id="user-menu-overlay" class="absolute inset-0 bg-[#0a0a1f]/95 z-30 transform translate-y-full transition-transform duration-300 flex flex-col">
                    </div>

                <form id="chat-form" class="p-3 border-t border-blue-500/20 bg-black/40 rounded-b-xl flex gap-2 relative z-20">
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

    // --- LOGIQUE MENU UTILISATEUR ---

    private openUserMenu(targetUsername: string, avatarUrl: string): void {
        const overlay = this.element.querySelector('#user-menu-overlay') as HTMLElement;
        if (!overlay) return;

        // Génération du contenu du menu
        overlay.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                <div class="relative">
                    <div class="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <img src="${avatarUrl}" class="w-full h-full rounded-full object-cover bg-black" />
                    </div>
                    <button id="close-menu-btn" class="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">✕</button>
                </div>
                
                <h3 class="pixel-font text-2xl text-white tracking-wide">${targetUsername}</h3>
                
                <div class="grid grid-cols-1 w-full gap-3">
                    <button data-action="profile" class="pixel-font w-full py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 rounded-lg transition-all flex items-center justify-center gap-2 group">
                        <span>👤</span> Voir le profil
                    </button>
                    
                    <button data-action="duel" class="pixel-font w-full py-3 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300 rounded-lg transition-all flex items-center justify-center gap-2 group">
                        <span class="group-hover:animate-bounce">⚔️</span> Inviter en Duel
                    </button>
                    
                    <div class="flex gap-3">
                        <button data-action="friend" class="pixel-font flex-1 py-3 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 text-green-300 rounded-lg transition-all">
                            + Ami
                        </button>
                        <button data-action="block" class="pixel-font flex-1 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 rounded-lg transition-all">
                            🚫 Bloquer
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Animation d'entrée
        overlay.classList.remove('translate-y-full');

        // Gestionnaires d'événements du menu
        const closeBtn = overlay.querySelector('#close-menu-btn');
        closeBtn?.addEventListener('click', () => {
            overlay.classList.add('translate-y-full');
        });

        const buttons = overlay.querySelectorAll('button[data-action]');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = (e.currentTarget as HTMLElement).dataset.action;
                this.handleUserAction(action, targetUsername, overlay);
            });
        });
    }

    private async handleUserAction(action: string | undefined, username: string, overlay: HTMLElement): Promise<void> {
        switch (action) {
            case 'profile':
                // Astuce pour UserDashboardView : on set le localStorage avant de naviguer
                localStorage.setItem("pong:last-dashboard-user", username);
                if (window.router) window.router.navigate('/dashboard');
                else window.location.href = '/dashboard';
                break;

            case 'duel':
                await this.initiateDuel(username, overlay);
                break;

            case 'friend':
                alert(`Demande d'ami envoyée à ${username} ! (Simulation)`);
                overlay.classList.add('translate-y-full');
                break;

            case 'block':
                if (confirm(`Bloquer ${username} ? Vous ne verrez plus ses messages.`)) {
                    // Logique de blocage locale (pourrait être stockée dans localStorage)
                    alert(`${username} a été bloqué.`);
                    overlay.classList.add('translate-y-full');
                }
                break;
        }
    }

    // --- LOGIQUE DUEL (Réintégrée de l'ancien ChatView) ---
    private async initiateDuel(targetUsername: string, overlay: HTMLElement): Promise<void> {
        const btn = overlay.querySelector('button[data-action="duel"]') as HTMLButtonElement;
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin">⌛</span> Création...`;

        try {
            // 1. Créer une room QuickPlay privée
            const host = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
            const myId = this.auth.getPlayerId();
            const mySkill = sessionStorage.getItem('selectedSkill') || 'smash'; // Défaut

            const response = await fetch(`https://${host}/quickplay/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: this.auth.getUsername(), 
                    playerId: myId, 
                    selectedSkill: mySkill 
                })
            });

            const data = await response.json();

            if (data.success && data.roomId) {
                // 2. Envoyer l'invitation via le chat (message système caché ou formaté)
                const inviteMsg = `__DUEL_INVITE__|${this.auth.getUsername()}|${targetUsername}|${data.roomId}`;
                await this.sendDirectMessage(inviteMsg);
                
                alert(`Invitation envoyée à ${targetUsername} !`);
                overlay.classList.add('translate-y-full');
            } else {
                throw new Error(data.error || "Erreur création room");
            }
        } catch (err) {
            console.error(err);
            alert("Impossible de créer le duel. Vérifiez votre connexion.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    private async sendDirectMessage(content: string): Promise<void> {
        const username = this.auth.getUsername();
        try {
            const url = `${this.getApiBaseUrl()}/userback/chat/messages`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, content })
            });
        } catch (e) {
            console.error("Send DM failed", e);
        }
    }

    // ---------------------------

    private sanitizedUsername(): string {
        const user = this.auth.getUsername();
        const div = document.createElement('div');
        div.textContent = user;
        return div.innerHTML;
    }

    private getAvatar(msg: any): string {
        if (msg.avatar) return msg.avatar;
        if (msg.username === this.auth.getUsername()) {
            return localStorage.getItem('player_avatar') || '/sprites/cat.gif';
        }
        return '/sprites/cat.gif';
    }

    private getApiBaseUrl(): string {
        const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
        const host = (hostRaw || '').replace(/^https?:\/\//, '').replace(/^http?:\/\//, '').replace(/\/$/, '').trim();
        const protocol = window.location.protocol; 
        return `${protocol}//${host}`;
    }

    private processIncomingMessages(messages: ChatMessage[]) {
        let hasNew = false;

        messages.forEach(msg => {
            const msgDate = new Date(msg.created_at).getTime();
            if (msgDate <= this.lastMessageTimestamp) return;
            if (msg.content.startsWith('__DUEL_ACCEPT__')) return;

            if (msg.content.startsWith('__DUEL_INVITE__')) {
                this.renderInviteMessage(msg);
                this.lastMessageTimestamp = Math.max(this.lastMessageTimestamp, msgDate);
                return;
            }

            const signature = `${msg.username}:${msg.content}`;
            if (msg.username === this.auth.getUsername() && this.sentMessagesSignature.has(signature)) {
                this.sentMessagesSignature.delete(signature);
                this.lastMessageTimestamp = Math.max(this.lastMessageTimestamp, msgDate);
                return;
            }

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
        } catch (err) { }
    }

    private connectWebSocket(): void {
        const hostRaw = import.meta.env.VITE_HOST || `${window.location.hostname}:8443`;
        const host = (hostRaw || '').replace(/^https?:\/\//, '').replace(/^http?:\/\//, '').replace(/\/$/, '').trim();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${host}/userback/chat`;

        try {
            this.socket = new WebSocket(wsUrl);
            this.socket.onopen = () => this.updateConnectionStatus(true);
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.username && data.content) this.processIncomingMessages([data]);
                } catch (e) { console.error("[Chat] Parse error", e); }
            };
            this.socket.onclose = () => {
                this.updateConnectionStatus(false);
                setTimeout(() => this.connectWebSocket(), 10000);
            };
        } catch (err) { console.error("[Chat] Connection failed", err); }
    }

    private updateConnectionStatus(connected: boolean): void {
        if (this.wsStatusElement) {
            this.wsStatusElement.className = `w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-yellow-500'}`;
            this.wsStatusElement.setAttribute('title', connected ? 'Live' : 'Polling Mode');
        }
    }

    private async sendMessage(): Promise<void> {
        if (!this.inputElement) return;
        const content = this.inputElement.value.trim();
        if (!content) return;
        if (content.length > 200) { alert("Message too long"); return; }

        const username = this.auth.getUsername();
        const tempMsg: ChatMessage = { username, content, created_at: new Date().toISOString() };
        
        this.renderTextMessage(tempMsg, true);
        this.sentMessagesSignature.add(`${username}:${content}`);
        this.inputElement.value = '';
        this.scrollToBottom();

        try {
            const url = `${this.getApiBaseUrl()}/userback/chat/messages`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, content })
            });
        } catch (error) { console.error("Failed to send message", error); }
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
        const avatarUrl = this.getAvatar(msg);

        // Conteneur principal (Ligne)
        const row = document.createElement('div');
        row.className = `flex gap-3 mb-4 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`;
        
        if (animate) {
            row.classList.add('opacity-0', 'translate-y-2');
        }

        // 1. Avatar (Uniquement pour les autres)
        if (!isMe) {
            const avatarContainer = document.createElement('div');
            // Modification: Ajout de cursor-pointer et hover effect
            avatarContainer.className = `w-8 h-8 flex-shrink-0 rounded-full bg-blue-900/50 border border-blue-500/30 overflow-hidden shadow-lg order-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all`;
            
            // --- EVENT CLICK POUR LE MENU ---
            avatarContainer.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêcher la fermeture si on clique
                this.openUserMenu(msg.username, avatarUrl);
            });
            // --------------------------------

            const img = document.createElement('img');
            img.src = avatarUrl;
            img.className = "w-full h-full object-cover";
            img.alt = msg.username;
            img.onerror = () => { img.src = '/sprites/cat.gif'; };
            
            avatarContainer.appendChild(img);
            row.appendChild(avatarContainer);
        }

        // 2. Colonne Message
        const messageCol = document.createElement('div');
        messageCol.className = `flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`;

        const date = new Date(msg.created_at);
        const timeStr = isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const meta = document.createElement('div');
        meta.className = "flex gap-2 text-[10px] text-blue-300/50 mb-1 pixel-font items-center";
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = isMe ? 'YOU' : msg.username;
        nameSpan.className = `font-bold ${isMe ? "text-blue-400" : "text-pink-400"} cursor-pointer hover:underline`;
        
        // --- EVENT CLICK SUR LE NOM AUSSI ---
        if (!isMe) {
            nameSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openUserMenu(msg.username, avatarUrl);
            });
        }
        // ------------------------------------

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
        bubble.className = `px-3 py-2 rounded-lg text-sm break-words shadow-md leading-relaxed ${
            isMe 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none border border-blue-400/50' 
            : 'bg-gradient-to-br from-gray-800 to-gray-900 text-blue-100 rounded-tl-none border border-blue-500/20'
        }`;
        
        bubble.textContent = msg.content;

        messageCol.appendChild(meta);
        messageCol.appendChild(bubble);

        row.appendChild(messageCol);

        this.messagesContainer.appendChild(row);
        
        if (animate) {
            gsap.to(row, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
        }
        this.scrollToBottom();
    }

    private renderInviteMessage(msg: ChatMessage): void {
        if (!this.messagesContainer) return;

        const parts = msg.content.split('|');
        if (parts.length < 4) return;
        const [_, from, to, roomId] = parts;
        const myName = this.auth.getUsername();

        if (to !== myName) return;

        const wrapper = document.createElement('div');
        wrapper.className = "mb-4 w-full opacity-0 translate-y-2 flex justify-center";

        const card = document.createElement('div');
        card.className = "w-[90%] neon-border bg-black/80 p-3 rounded-lg border border-yellow-500/50 flex flex-col gap-2 shadow-[0_0_15px_rgba(234,179,8,0.1)]";

        const header = document.createElement('div');
        header.className = "flex items-center gap-3 border-b border-white/10 pb-2";
        
        const avatarImg = document.createElement('img');
        avatarImg.src = this.getAvatar({ username: from, avatar: undefined }); 
        avatarImg.className = "w-8 h-8 rounded-full border border-yellow-500";
        
        const titleContainer = document.createElement('div');
        const title = document.createElement('div');
        title.className = "text-yellow-400 pixel-font text-xs tracking-wider font-bold";
        title.innerHTML = `⚔️ DUEL REQUEST`;
        const sub = document.createElement('div');
        sub.className = "text-[10px] text-white/60";
        sub.textContent = `from ${from}`;

        titleContainer.appendChild(title);
        titleContainer.appendChild(sub);
        header.appendChild(avatarImg);
        header.appendChild(titleContainer);

        const actions = document.createElement('div');
        actions.className = "flex gap-2 mt-1";

        const acceptBtn = document.createElement('button');
        acceptBtn.className = "flex-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded pixel-font transition-all shadow-lg cursor-pointer";
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

        card.appendChild(header);
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
                setTimeout(() => {
                    this.inputElement?.focus();
                    this.scrollToBottom();
                }, 100);
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
