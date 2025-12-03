export interface Player
{
	id: string;
	username: string;
	avatar?: string;
	roomId ?: string;
	isReady: boolean;
	selectedSkill?: 'smash' | 'dash';
}

export interface Room
{
	id: string;
	players: Player[];
	status: 'waiting' | 'playing' | 'finished';
	createdAt: Date;
	isTournament?: boolean;
    tournamentId?: string;
    matchId?: string;
}

export type RoomFinishedPayload =
{
	roomId: string;
	reason: 'score' | 'timeout';
	winner?: Player | null;
	score?: { left: number; right: number };
};
