import type { ComponentProps, Component } from "./types";

interface GlobalChatProps extends ComponentProps
{
	type: 'global' | 'game' | 'private'
}

export class ChatComponant implements Component
{
	private element: HTMLElement
	private ws: WebSocket
	private type: string
	private statusElem: HTMLElement | null
	private chatHistory: HTMLDivElement
	private chatInput: HTMLInputElement

	constructor(element: HTMLElement)
	{
		const wsUrl = `wss://${import.meta.env.VITE_HOST}${import.meta.env.VITE_CHAT_ENDPOINT}`
					|| 'wss://localhost:8443/chatback/ws';

        this.element = element;
        this.type = element.getAttribute('data-chat-type') || 'global';
		this.ws = new WebSocket(wsUrl);
		this.statusElem = element.querySelector('h2');
		this.chatHistory = element.querySelector('.history') as HTMLDivElement
		this.chatInput = element.querySelector('input') as HTMLInputElement
        this.init();
    }

	private sendMessage = (msg: string): void => {
			const trimedMsg = msg.trim();
			if (this.ws && trimedMsg)
			{
				this.ws.send(trimedMsg)
			}
		}


	private handleKeyDown = (e: KeyboardEvent): void => {
		if (e.key === 'Enter' && !e.shiftKey)
		{
			e.preventDefault();
			const msg = this.chatInput.value;
			this.sendMessage(msg);
			this.chatInput.value = ''
		}
	}

	private init(): void
	{		
		console.log("init")
		this.ws.onopen = () => {
			this.ws.send('hi from client');
			this.statusElem!.innerHTML = 'Connecté au chat!';
		};
		
		this.ws.onmessage = (event) => {
			this.chatHistory!.innerHTML += `<p class="p-4 block bg-red-400 text-white rounded-xl w-fit">` + event.data + '</p>';
		};
		
		this.ws.onerror = () => {
			this.statusElem!.innerHTML = 'Erreur de connexion';
		};

		this.chatInput?.addEventListener("keydown", this.handleKeyDown)
    }
    
    cleanup(): void
	{
        this.chatInput.removeEventListener('keydown', this.handleKeyDown)
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.close();
		}
    }
}

export function Chat({
	className = '',
	type = 'global'
} : GlobalChatProps) {
	const chatClasses = `${className}
	${type == 'global' ? `` : ``}
	`;


	return `
		<div class="${chatClasses}"
			data-component="chat"
			data-chat-type=${type}	
		>
			<h2 class="text-3xl">Connexion en cours...</h2>
			<div class="history mt-4 flex flex-col gap-4"></div>
			<input type="text" id="chatInput" name="chatInput"
				placeholder="Tapez votre message..."
				class="border-2 rounded-md p-4 w-full mt-4" />
		<div>
	`
}
