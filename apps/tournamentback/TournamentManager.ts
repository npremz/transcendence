import type { Match, Player, registration, Tournament } from "./types";
import { v4 as uuidv4 } from 'uuid'

export class TournamentManager
{
	private tournaments = new Map<string, Tournament>

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

	createTournament(name: string, maxPlayers: number): Tournament
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

		this.tournaments.set(tournament.id, tournament);
		return tournament;
	}

	registerPlayer(tournamentId: string, newPlayer: Player): boolean
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament || tournament.status !== 'registration') return false;
		if (tournament.currentPlayers. length >= tournament.maxPlayers) return false;

		const isPlayerInTournament = tournament.currentPlayers.some(
			player => player.id === newPlayer.id
		);
		tournament.currentPlayers.push(newPlayer);

		if (tournament.currentPlayers.length === tournament.maxPlayers)
		{
			this.startTournament(tournamentId);
		}

		updateRegistratedPlayers(tournamentId)

		return true;
	}

	startTournament(tournamentId: string): void
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament) return;

		const shuffledPlayers = this.shuffleArray([... tournament.currentPlayers])

		const firstRoundMatches: Match[] = [];
		for (var i = 0; i < shuffledPlayers.length; i += 2);
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

		this.createTournament(tournament.name, tournament.maxPlayers)

		//this.startNextMatch(tournamentId);
	}

	async startNextMatch(tournamentId: string): Promise<void>
	{
		const tournament = this.tournaments.get(tournamentId)
		if (!tournament) return;

		const nextMatch = tournament.bracket.find(m => {
			m.status === 'ready' &&
			m.round === tournament.currentRound &&
			m.player1 && m.player2
		})

		if (!nextMatch)
		{
			this.checkRoundCompletion(tournamentId);
			return;
		}

		try
		{
			const response = await fetch('https://localhost:8443/quickplay/tournament-match', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json'},
				body: JSON.stringify({
					matchId: nextMatch.id,
					player1: nextMatch.player1,
					player2: nextMatch.player2,
					tournamentId: tournament.id
				})
			})

			const { roomId } = await response.json();
			nextMatch.roomId = roomId;
			nextMatch.status = 'in_progress'

			console.log(`Match started: ${nextMatch.player1?.username} vs ${nextMatch.player2?.username}`)
			this.notifyPlayers(nextMatch, {type: 'match_ready'});
		}
		catch (err)
		{
			console.error('Failed to create  tournament match:', err);
		}
	}

	onMatchFinished(matchId: string, winnerId: string): void
	{
		const match = this.findMatchById(matchId);
		if (match === null) return;

		const tournament = this.tournaments.get(match.tournamentId)
		if (!tournament) return;

		match.winner = match.player1?.id === winnerId ? match.player1 : match.player2
		match.status = 'finished'
		match.finishedAt = new Date();

		console.log(`Match finished: ${match.winner?.username} wins!`)

		this.checkRoundCompletion(match.tournamentId);
	}

	checkRoundCompletion(tournamentId: string): void
	{
		const tournament = this.tournaments.get(tournamentId)
		if (!tournament) return;

		const currentRoundMatches = tournament.bracket.filter(m => m.round === tournament.currentRound);
		const finishedMatches = currentRoundMatches.filter(m => m.status === 'finished');

		if (finishedMatches.length === currentRoundMatches.length)
		{
			if (finishedMatches.length === 1 && tournament.currentRound > 1)
			{
				tournament.winner = finishedMatches[0].winner;
				tournament.status = 'finished';
				tournament.finishedAt = new Date();

				console.log(`Tournament finished! Winner: ${tournament.winner?.username}`);
				this.notifyTournamentEnd(tournament);
				return
			}

			this.createNextRound(tournament, finishedMatches);
		}

		this.startNextMatch(tournamentId);
	}

	createNextRound(tournament: Tournament, previousMatches: Match[]): void
	{
		const nextRound = tournament.currentRound + 1;
		const winners = previousMatches.map(m => m.winner!).filter(Boolean)

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
				nextRoundMatches.push(match)
			}
		}

		tournament.bracket.push(...nextRoundMatches);
		tournament.currentRound = nextRound;

		console.log(`Round ${nextRound} created with ${nextRoundMatches.length} matches`);
	}

	notifyTournamentEnd(tournament: Tournament)
	{
		tournament.bracket.forEach(match => {
			const message = {type: 'tournamentEnd', winner: `${tournament.winner?.username}`}
			try {
				if (match.player1?.ws.readyState === match.player1?.ws.OPEN)
				{
					match.player1?.ws.send(JSON.stringify(message))
				}
			} 
			catch (err)
			{
				console.error("Error notifying player1:", err)
			}
			try {
				if (match.player2?.ws.readyState === match.player2?.ws.OPEN)
					{
						match.player2?.ws.send(JSON.stringify(message))
					}
			} 
			catch (err)
			{
				console.error("Error notifying player2:", err)
			}
		})
	}

	notifyPlayers(match: Match, message: object)
	{
		try {
			if (match.player1?.ws.readyState === match.player1?.ws.OPEN)
				{
					match.player1?.ws.send(JSON.stringify(message))
				}
		} 
		catch (err)
		{
			console.error("Error notifying player1:", err)
		}
		try {
			if (match.player2?.ws.readyState === match.player2?.ws.OPEN)
				{
					match.player2?.ws.send(JSON.stringify(message))
				}
		} 
		catch (err)
		{
			console.error("Error notifying player2:", err)
		}
	}

	updateRegistratedPlayers(tournamentId: string)
	{
		const tournament = this.tournaments.get(tournamentId)
		if (!tournament) return;

		tournament.forEach(element => {
			
		});
	}

	findMatchById(id: string) : Match | null
	{
		let match: Match | undefined;
		this.tournaments.forEach(tournament => {
			match = tournament.bracket.find(m => {
				m.id === id;
			})
		})

		if (match != undefined)
			return match
		return null;
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
}
