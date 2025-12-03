import type { Match, Player, registration, Tournament } from "./types";
import { v4 as uuidv4 } from 'uuid'

async function callDatabase(endpoint: string, method: string = 'GET', body?: any)
{
	const url = `http://database:3020${endpoint}`;
	
	const options: RequestInit = {
		method,
	};

	if (body && method !== 'GET') {
		options.headers = { 'Content-Type': 'application/json' };
		options.body = JSON.stringify(body);
	}
	
	if (body && method !== 'GET')
	{
		options.body = JSON.stringify(body);
	}
	
	const response = await fetch(url, options);
	return response.json();
}

async function callUserback(endpoint: string, method: string = 'GET', body?: any)
{
	const url = `http://userback:3060${endpoint}`;
	
	const options: RequestInit = {
		method,
	};

	if (body && method !== 'GET') {
		options.headers = { 'Content-Type': 'application/json' };
		options.body = JSON.stringify(body);
	}
	
	const response = await fetch(url, options);
	return response.json();
}

export class TournamentManager
{
	private tournaments = new Map<string, Tournament>()

	initTournaments(): void
	{
		this.createTournament("4p", 4);
		this.createTournament("8p", 8);
		this.createTournament("16p", 16);
	}

	getCurrentRegistrations(): registration[]
	{
		let currentRegistrations: registration[] = []

		this.tournaments.forEach(tournament => {
			if ('registration' === tournament.status)
			{
				const registration: registration = {
					id: tournament.id,
					name: tournament.name,
					currentPlayerCount: tournament.currentPlayers.length
				}
				currentRegistrations.push(registration)
			}
		})

		return currentRegistrations;
	}

	async createTournament(name: string, maxPlayers: number): Promise<Tournament>
	{
		const tournament: Tournament = {
			id: uuidv4(),
			name,
			status: 'registration',
			maxPlayers,
			currentPlayers: [],
			bracket: [],
			currentRound: 0,
			createdAt: new Date()
		}

		try
		{
			await callDatabase('/tournaments', 'POST', {
				id: tournament.id,
				name: tournament.name,
				max_players: tournament.maxPlayers
			});
		}
		catch (err)
		{
			console.error('Failed to create tournament in DB:', err);
		}

		this.tournaments.set(tournament.id, tournament);
		return tournament;
	}

	async registerPlayer(tournamentId: string, newPlayer: Player): Promise<boolean>
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament || tournament.status !== 'registration') return false;
		if (tournament.currentPlayers.length >= tournament.maxPlayers) return false;

		try
		{
			await callDatabase('/users', 'POST', {
				id: newPlayer.id,
				username: newPlayer.username
			});
		}
		catch (err)
		{
			console.log('User already exists or DB error:', err);
		}

		// Récupérer l'avatar depuis userback
		try {
			const userbackResult = await callUserback(`/users?username=${encodeURIComponent(newPlayer.username)}`);
			if (userbackResult.success && userbackResult.user?.avatar) {
				newPlayer.avatar = userbackResult.user.avatar;
				// Synchroniser dans database
				await callDatabase(`/users/${newPlayer.id}/avatar`, 'PATCH', { avatar: newPlayer.avatar });
			}
		} catch (err) {
			console.log('Failed to get avatar from userback:', err);
		}

		try
		{
			await callDatabase(`/users/${newPlayer.id}/last-seen`, 'PATCH');
		}
		catch (err)
		{
			console.log('Failed to update last_seen:', err);
		}

		this.removePlayerFromOtherRegistrations(newPlayer.id, tournamentId);

		const isPlayerInTournament = tournament.currentPlayers.some(
			player => player.id === newPlayer.id
		);
		
		if (!isPlayerInTournament)
		{
			tournament.currentPlayers.push(newPlayer);

			try
			{
				await callDatabase('/tournament-registrations', 'POST', {
					tournament_id: tournamentId,
					player_id: newPlayer.id
				});
			}
			catch (err)
			{
				console.error('Failed to register player in DB:', err);
			}
		}

		if (tournament.currentPlayers.length === tournament.maxPlayers)
		{
			await this.startTournament(tournamentId);
		}

		return true;
	}

	removePlayerFromOtherRegistrations(playerId: string, excludeTournamentId: string): void
	{
		for (const [tournamentId, tournament] of this.tournaments)
		{
			if (tournament.status === 'registration' && tournamentId !== excludeTournamentId)
			{
				const playerIndex = tournament.currentPlayers.findIndex(p => p.id === playerId);
				if (playerIndex !== -1)
				{
					tournament.currentPlayers.splice(playerIndex, 1);
					console.log(`Player ${playerId} removed from tournament ${tournament.name} (switching tournaments)`);

					callDatabase(`/tournament-registrations/tournament/${tournamentId}/player/${playerId}`, 'DELETE')
						.catch(err => console.error('Failed to remove registration from DB:', err));
				}
			}
		}
	}

	removePlayerFromAllRegistrations(playerId: string): boolean
	{
		let removed = false;
		for (const [_, tournament] of this.tournaments)
		{
			if (tournament.status === 'registration')
			{
				const playerIndex = tournament.currentPlayers.findIndex(p => p.id === playerId);
				if (playerIndex !== -1)
				{
					tournament.currentPlayers.splice(playerIndex, 1);
					console.log(`Player ${playerId} removed from tournament ${tournament.name}`);
					removed = true;

					callDatabase(`/tournament-registrations/tournament/${tournamentId}/player/${playerId}`, 'DELETE')
						.catch(err => console.error('Failed to remove registration from DB:', err));
				}
			}
		}
		return removed;
	}

	async startTournament(tournamentId: string): Promise<void>
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament) return;

		const shuffledPlayers = this.shuffleArray([... tournament.currentPlayers])

		const firstRoundMatches: Match[] = [];
		for (var i = 0; i < shuffledPlayers.length; i += 2)
		{
			const match: Match = {
				id: uuidv4(),
				tournamentId,
				round: 1,
				position: Math.floor(i / 2),
				player1: shuffledPlayers[i],
				player2: shuffledPlayers[i + 1],
				status: 'ready'
			};
			firstRoundMatches.push(match);
		}

		tournament.bracket = firstRoundMatches;
		tournament.status = 'in_progress';
		tournament.currentRound = 1;
		tournament.StartedAt = new Date();

		try
		{
			await callDatabase(`/tournaments/${tournamentId}/start`, 'PATCH');
		}
		catch (err)
		{
			console.error('Failed to start tournament in DB:', err);
		}

		await this.createTournament(tournament.name, tournament.maxPlayers)
		console.log(`Tournament ${tournament.name} started with ${tournament.currentPlayers.length} players`);

		await this.startNextMatch(tournamentId);
	}

	async startNextMatch(tournamentId: string): Promise<void>
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament) return;

		const nextMatch = tournament.bracket.find(m => 
			m.status === 'ready' &&
			m.round === tournament.currentRound &&
			m.player1 && m.player2
		);

		if (!nextMatch)
		{
			console.log(`No more matches ready in round ${tournament.currentRound}`);
			this.checkRoundCompletion(tournamentId);
			return;
		}

		try
		{
			const url = `http://quickplayback:3030/tournament-match`;

			console.log(`Creating tournament match: ${nextMatch.player1?.username} vs ${nextMatch.player2?.username}`);

			const gameId = uuidv4();
			await callDatabase('/games', 'POST', {
				id: gameId,
				room_id: `tournament-${nextMatch.id}`,
				game_type: 'tournament',
				tournament_id: tournament.id,
				tournament_round: tournament.currentRound,
				match_position: nextMatch.position,
				player_left_id: nextMatch.player1!.id,
				player_right_id: nextMatch.player2!.id
			});

			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					matchId: nextMatch.id,
					tournamentId: tournament.id,
					player1: {
						id: nextMatch.player1!.id,
						username: nextMatch.player1!.username,
						avatar: nextMatch.player1!.avatar
					},
					player2: {
						id: nextMatch.player2!.id,
						username: nextMatch.player2!.username,
						avatar: nextMatch.player2!.avatar
					}
				}),
			});

			if (!response.ok)
			{
				throw new Error(`Failed to create match: ${response.statusText}`);
			}

			const data = await response.json();
			
			nextMatch.roomId = data.roomId;
			nextMatch.status = 'in_progress';
			nextMatch.scheduledAt = new Date();

			await callDatabase(`/games/room/${data.roomId}/start`, 'PATCH');

			console.log(`Match started successfully: roomId=${data.roomId}`);
		}
		catch (err)
		{
			console.error('Failed to create tournament match:', err);
			setTimeout(() => this.startNextMatch(tournamentId), 5000);
		}
	}

	async onMatchFinished(matchId: string, winnerId: string): Promise<void>
	{
		const match = this.findMatchById(matchId);
		if (!match)
		{
			console.error(`Match ${matchId} not found`);
			return;
		}

		const tournament = this.tournaments.get(match.tournamentId);
		if (!tournament)
		{
			console.error(`Tournament ${match.tournamentId} not found`);
			return;
		}

		match.winner = match.player1?.id === winnerId ? match.player1 : match.player2;
		match.status = 'finished';
		match.finishedAt = new Date();

		console.log(`Match finished: ${match.winner?.username} wins!`);

		const loser = match.player1?.id === winnerId ? match.player2 : match.player1;
		if (loser) {
			const loserInTournament = tournament.currentPlayers.find(p => p.id === loser.id);
			if (loserInTournament) {
				loserInTournament.isEleminated = true;

				await callDatabase(
					`/tournament-registrations/tournament/${tournament.id}/player/${loser.id}/eliminate`,
					'PATCH'
				);
			}
		}

		await callDatabase(`/users/${winnerId}/stats`, 'PATCH', { won: loser ? false : true});

		await this.checkRoundCompletion(match.tournamentId);
	}

	async checkRoundCompletion(tournamentId: string): Promise<void> {
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament) return;

		const currentRoundMatches = tournament.bracket.filter(m => m.round === tournament.currentRound);
		const finishedMatches = currentRoundMatches.filter(m => m.status === 'finished');
		const inProgressMatches = currentRoundMatches.filter(m => m.status === 'in_progress');

		console.log(`Round ${tournament.currentRound} status: ${finishedMatches.length}/${currentRoundMatches.length} finished, ${inProgressMatches.length} in progress`);

		if (inProgressMatches.length > 0)
		{
			console.log('Waiting for matches to finish...');
			return;
		}

		if (finishedMatches.length === currentRoundMatches.length)
		{
			if (finishedMatches.length === 1 && tournament.currentRound > 1)
			{
				tournament.winner = finishedMatches[0].winner;
				tournament.status = 'finished';
				tournament.finishedAt = new Date();

				await callDatabase(`/tournaments/${tournamentId}/finish`, 'PATCH', {
					winner_id: tournament.winner?.id
				});

				console.log(`Tournament finished! Winner: ${tournament.winner?.username}`);
				
				// Register tournament result on blockchain
				if (tournament.winner) {
					await this.registerTournamentOnBlockchain(
						tournament.id,
						tournament.name,
						tournament.maxPlayers,
						tournament.winner.id,
						tournament.winner.username
					);
				}
				
				return;
			}

			console.log(`Creating round ${tournament.currentRound + 1}`);
			await this.createNextRound(tournament, finishedMatches);

			await callDatabase(`/tournaments/${tournamentId}/next-round`, 'PATCH');
			
			await this.startNextMatch(tournamentId);
		}
		else
		{
			await this.startNextMatch(tournamentId);
		}
	}

	async createNextRound(tournament: Tournament, previousMatches: Match[]): Promise<void> {
        const nextRound = tournament.currentRound + 1;
        const winners = previousMatches.map(m => m.winner!).filter(Boolean);

        const nextRoundMatches: Match[] = [];
        for (let i = 0; i < winners.length; i += 2)
		{
            if (winners[i + 1])
			{
                const match: Match = {
                    id: uuidv4(),
                    tournamentId: tournament.id,
                    round: nextRound,
                    position: Math.floor(i / 2),
                    player1: winners[i],
                    player2: winners[i + 1],
                    status: 'ready'
                };
                nextRoundMatches.push(match);
            }
        }

        tournament.bracket.push(...nextRoundMatches);
        tournament.currentRound = nextRound;

        console.log(`Round ${nextRound} created with ${nextRoundMatches.length} matches`);
    }

	findMatchById(id: string): Match | null
	{
        for (const tournament of this.tournaments.values()) {
            const match = tournament.bracket.find(m => m.id === id);
            if (match) return match;
        }
        return null;
    }

	getTournamentBrackets(tournamentId: string): Match[] | null
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament) return null;
		
		return tournament.bracket;
	}

	getTournamentDetails(tournamentId: string): Tournament | null
	{
		const tournament = this.tournaments.get(tournamentId);
		return tournament || null;
	}

	private shuffleArray<T>(array: T[]): T[]
	{
		const shuffled = [...array];

		for (let i = shuffled.length - 1; i > 0; i--)
		{
			const randIdx = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[randIdx]] = [shuffled[randIdx], shuffled[i]]
		}

		return shuffled
	}

	private async registerTournamentOnBlockchain(
		tournamentId: string,
		tournamentName: string,
		maxPlayers: number,
		winnerId: string,
		winnerUsername: string
	): Promise<void> {
		try {
			const url = `http://blockchainback:3070/register-tournament`;

			console.log(`Registering tournament ${tournamentId} on blockchain...`);

			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tournamentId,
					tournamentName,
					maxPlayers,
					winnerId,
					winnerUsername
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(`Blockchain registration failed: ${error.error || response.statusText}`);
			}

			const data = await response.json();
			console.log(`Tournament ${tournamentId} registered on blockchain: ${data.transactionHash}`);
		} catch (error) {
			console.error('Failed to register tournament on blockchain:', error);
		}
	}
}
