export interface Player
{
	id: string;
	username: string;
	currentTournament?: string;
	isEleminated: boolean;
}

export interface Match
{
	id: string;
	tournamentId: string;
	round: number;
	player1?: Player;
	player2?: Player;
	winner?: Player;
	roomId?: string;
	status: 'pending' | 'ready' | 'in_progress' | 'finished';
	scheduledAt?: Date;
	finishedAt?: Date;
}

export interface Tournament
{
	id: string;
	name: string;
	status: 'registration' | 'in_progress' | 'finished';
	maxPlayers: number;
	currentPlayers: Player[];
	bracket: Match[];
	currentRound: number;
	winner?: Player;
	createdAt: Date;
	StartedAt?: Date;
	finishedAt?: Date;
}
