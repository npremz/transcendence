export interface Player
{
	id: string;
	username: string;
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

export type RoomFinishedPayload =
{
	roomId: string;
	reason: 'score' | 'timeout';
	winner?: Player | null;
	score?: { left: number; right: number };
};
