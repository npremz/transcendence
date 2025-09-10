export interface Game
{
	id?: number;
	player1_name: string;
	player2_name: string;
	player1_score: number;
	player2_score: number;
	duration: number; // secondes
	status: 'active' | 'finished';
	started_at?: string;
	finished_at?: string | null;
}

export interface CreateGameRequest
{
	player1_name: string;
	player2_name: string;
}

export interface UpdateGameRequest
{
	player1_score?: number;
	player2_score?: number;
	duration?: number;
	status?: 'active' | "finished";
	finished_at?: string;
}

export interface GlobalMessage
{
	id?: number;
	username: string;
	content: string;
	timestamp?: string;
}

export interface GameMessage
{
	id?: number;
	game_id: number;
	username: string;
	content: string;
	timestamp?: string;
}

export interface CreateMessageRequest
{
	username: string;
	content: string;
}

export interface CreateGameMessageRequest extends CreateMessageRequest
{
	game_id: number;
}

export interface ApiResponse<T>
{
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T>
{
	success: boolean;
	data: T[];
	pagination: {
		total: number;
		page: number;
		limit: number;
	}
}
