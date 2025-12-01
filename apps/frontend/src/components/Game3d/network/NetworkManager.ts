import { WSClient, type PublicState } from "../../../net/wsClient";
import type { InputState } from "../types";

export class NetworkManager  {
	private wsClient: WSClient;
	private roomId: string;
	private isConnected: boolean = false;

	// callbacks
	public onStateUpdate?: (state: PublicState) => void;
	public onWelcome?: (side: 'left' | 'right' | 'spectator', playerNames?: any) => void;
	public onGameOver?: (winner: string, isTournament?: boolean, tournamentId?: string) => void;
	public onPaused?: () => void;
	public onResumed?: () => void;
	public onCountdown?: (value: number) => void;
	public onTimeoutStatus?: (status: { left: { active: boolean; remainingMs: number }; right: { active: boolean; remainingMs: number } }) => void;

	constructor(roomId: string) {
		this.roomId = roomId;
		this.wsClient = new WSClient();
		this.setupNetworkHandlers();
	}

	private setupNetworkHandlers() {
		this.wsClient.onState = (state) => {
			if (this.onStateUpdate) {
				this.onStateUpdate(state);
			}
		}
		this.wsClient.onWelcome = (side, playerNames) => {
			this.isConnected = true;
			if (this.onWelcome) {
				this.onWelcome(side, playerNames);
			}
		}
		this.wsClient.onGameOver = (winner, isTournament, tournamentId) => {
			if (this.onGameOver) {
				this.onGameOver(winner, isTournament, tournamentId);
			}
		}
		this.wsClient.onPaused = () => {
			if (this.onPaused) {
				this.onPaused();
			}
		}

		this.wsClient.onResumed = () => {
			if (this.onResumed) this.onResumed();
		};

		this.wsClient.onCountdown = (v) => {
			if (this.onCountdown) this.onCountdown(v);
		};

		this.wsClient.onTimeoutStatus = (s) => {
			if (this.onTimeoutStatus) this.onTimeoutStatus(s);
		};
	}

	public connect(): void {
		const storedUrl = sessionStorage.getItem('gameServerURL') || undefined;
		if (storedUrl) {
			this.wsClient.connect(storedUrl);
		} else {
			const host = import.meta.env.VITE_HOST;
			const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
			const fallbackUrl = host && endpoint && this.roomId
				? `wss://${host}${endpoint}/${this.roomId}`
				: undefined;
			this.wsClient.connect(fallbackUrl);
		}
	}

	public sendInput(input: InputState): void {
		if (!this.isConnected) return;
		const side = this.wsClient.side;

		let up = false;
		let down = false;

		if (side === 'left') {
			up = input.up || input.left;
			down = input.down || input.right;
		} else {
			up = input.up || input.right;
			down = input.down || input.left;
		}
		this.wsClient.sendInput(up, down);
	}

	public sendReady(): void {
		if (!this.isConnected) return;
		this.wsClient.sendReady();
	}

	public useSkill(): void {
		if (!this.isConnected) return;
		this.wsClient.useSkill();
	}

	public forfeit(): void {
		if (!this.isConnected) return;
		this.wsClient.forfeit();
	}

	public getSide(): 'left' | 'right' | 'spectator' {
		return this.wsClient.side;
	}

	public disconnect(): void {
		this.wsClient.cleanup();
		this.isConnected = false;
		this.onStateUpdate = undefined;
		this.onWelcome = undefined;
		this.onGameOver = undefined;
		this.onPaused = undefined;
		this.onResumed = undefined;
		this.onCountdown = undefined;
		this.onTimeoutStatus = undefined;
	}
}
