import { toUnicode } from "punycode";
import type { Match, Player, Tournament } from "./types";
import { v4 as uuidv4 } from 'uuid'

export class TournamentManager
{
	private tournaments = new Map<string, Tournament>

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

	registerPlayer(tournamentId: string, player: Player): boolean
	{
		const tournament = this.tournaments.get(tournamentId);
		if (!tournament || tournament.status !== 'registration') return false;
		if (tournament.currentPlayers. length >= tournament.maxPlayers) return false;

		tournament.currentPlayers.push(player);

		if (tournament.currentPlayers.length === tournament.maxPlayers)
		{
			this.startTournament(tournamentId);
		}
		return true;
	}
}
