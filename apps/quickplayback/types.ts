export interface Player
{
	id: string;
	username: string;
	socket: any;
	roomId ?: string;
	isReady: boolean;
}

export interface Room
{
	id: string;
	players: Player[];
	status: 'waiting' | 'playing' | 'finished';
	createdAt: Date;
}

export type ClientMessage = 
	| { type : 'join_quickplay'; username: string }
	| { type : 'player_ready' }
	| { type : 'player_input' ; input: any};

export type ServerMessage = 
	| { type: 'waiting_for_opponent' }
	| { type: 'game_start'; roomId: string; playerNumber: 1 | 2 }
	| { type: 'opponent_disconnected' }
	| { type: 'error'; message: string }
