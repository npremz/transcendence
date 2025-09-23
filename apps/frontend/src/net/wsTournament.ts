import { v4 as uuidv4 } from 'uuid'

export interface registration
{
	id: string;
	name: string;
	currentPlayerCount: number;
}


type ServerMsg = 
	| {type: 'update', registrations: registration[]}

export type ClientMessage =
	| {type: 'join', tournamentId: string | null, username: string, playerId: string}

export class wsTournament {
	private ws?: WebSocket | null = null;
	private tournamentBtns;
	private id: string

	constructor(elems: NodeListOf<Element>)
	{
		this.tournamentBtns = elems
		this.id = uuidv4()
	}

	connect(url?: string) {
		const host = import.meta.env.VITE_HOST
		const endpoint = import.meta.env.VITE_TOURNAMENT_WS_ENDPOINT
		const defaultUrl = (host && endpoint) ? `wss://${host}${endpoint}`
					: 'wss://localhost:8443/tournamentback/ws';
		console.log(`tournament ws link: `, defaultUrl)
		this.ws = new WebSocket(url ?? defaultUrl);

		this.ws.onmessage = (ev) => {
			const msg = JSON.parse(ev.data) as ServerMsg;
			console.log(msg)
			switch (msg.type)
			{
				case 'update':
					this.tournamentBtns.forEach(btn => {
						const span: HTMLSpanElement | null = btn.querySelector("span");
						msg.registrations.forEach(tournament => {
							const slots = btn.getAttribute('data-slots')
							if (tournament.name === slots + 'p')
							{
								span!.innerText = `${tournament.currentPlayerCount}/${slots}`
								btn.setAttribute("data-tournament-id", tournament.id)
							}
						})
					})
			}
		};
	}

	join(tournamentId: string | null, username: string) {
		const msg: ClientMessage = {
			type: 'join',
			tournamentId: tournamentId,
			username: username,
			playerId: this.id
		}
		this.ws?.send(JSON.stringify(msg))
	}

	close(): void
	{
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}
}
