/**
 * Local Tournament Manager
 * Manages local tournament bracket generation and state without backend
 */

export interface LocalPlayer {
  id: string;
  username: string;
  selectedSkill: 'smash' | 'dash';
  eliminated: boolean;
}

export interface LocalMatch {
  id: string;
  round: number;
  position: number;
  player1?: LocalPlayer;
  player2?: LocalPlayer;
  winner?: LocalPlayer;
  status: 'pending' | 'ready' | 'in_progress' | 'finished';
}

export interface LocalTournament {
  id: string;
  size: 4 | 8;
  players: LocalPlayer[];
  bracket: LocalMatch[];
  currentRound: number;
  status: 'setup' | 'in_progress' | 'finished';
  winner?: LocalPlayer;
  createdAt: Date;
}

export class LocalTournamentManager {
  private static readonly STORAGE_KEY = 'localTournament';

  /**
   * Create a new local tournament
   */
  static createTournament(size: 4 | 8, players: Omit<LocalPlayer, 'eliminated'>[]): LocalTournament {
    if (players.length !== size) {
      throw new Error(`Expected ${size} players, got ${players.length}`);
    }

    const tournament: LocalTournament = {
      id: this.generateId(),
      size,
      players: players.map(p => ({ ...p, eliminated: false })),
      bracket: [],
      currentRound: 1,
      status: 'setup',
      createdAt: new Date(),
    };

    // Shuffle players for fairness
    const shuffledPlayers = this.shuffleArray([...tournament.players]);

    // Generate first round bracket
    tournament.bracket = this.generateFirstRound(shuffledPlayers);
    tournament.status = 'in_progress';

    this.saveTournament(tournament);
    return tournament;
  }

  /**
   * Generate first round matches from shuffled players
   */
  private static generateFirstRound(players: LocalPlayer[]): LocalMatch[] {
    const matches: LocalMatch[] = [];
    const matchCount = players.length / 2;

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        id: this.generateId(),
        round: 1,
        position: i,
        player1: players[i * 2],
        player2: players[i * 2 + 1],
        status: 'ready',
      });
    }

    return matches;
  }

  /**
   * Get the current tournament from storage
   */
  static getCurrentTournament(): LocalTournament | null {
    const data = sessionStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      const tournament = JSON.parse(data);
      // Convert date strings back to Date objects
      tournament.createdAt = new Date(tournament.createdAt);
      return tournament;
    } catch (error) {
      console.error('Failed to parse tournament data:', error);
      return null;
    }
  }

  /**
   * Save tournament to storage
   */
  static saveTournament(tournament: LocalTournament): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(tournament));
  }

  /**
   * Clear tournament from storage
   */
  static clearTournament(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get the next match to be played
   */
  static getNextMatch(tournament: LocalTournament): LocalMatch | null {
    return tournament.bracket.find(
      m => m.status === 'ready' && m.round === tournament.currentRound
    ) || null;
  }

  /**
   * Get all matches for a specific round
   */
  static getMatchesForRound(tournament: LocalTournament, round: number): LocalMatch[] {
    return tournament.bracket.filter(m => m.round === round);
  }

  /**
   * Record match result and update bracket
   */
  static recordMatchResult(matchId: string, winnerId: string): LocalTournament | null {
    const tournament = this.getCurrentTournament();
    if (!tournament) return null;

    const match = tournament.bracket.find(m => m.id === matchId);
    if (!match) return null;

    // Determine winner and loser
    const winner = match.player1?.id === winnerId ? match.player1 : match.player2;
    const loser = match.player1?.id === winnerId ? match.player2 : match.player1;

    if (!winner || !loser) return null;

    // Update match
    match.winner = winner;
    match.status = 'finished';

    // Mark loser as eliminated
    const loserInPlayers = tournament.players.find(p => p.id === loser.id);
    if (loserInPlayers) {
      loserInPlayers.eliminated = true;
    }

    // Check if current round is complete
    const currentRoundMatches = this.getMatchesForRound(tournament, tournament.currentRound);
    const allFinished = currentRoundMatches.every(m => m.status === 'finished');

    if (allFinished) {
      // Check if tournament is over
      if (currentRoundMatches.length === 1) {
        // Final match - tournament complete
        tournament.status = 'finished';
        tournament.winner = winner;
      } else {
        // Create next round
        this.createNextRound(tournament);
      }
    }

    this.saveTournament(tournament);
    return tournament;
  }

  /**
   * Create next round from winners of current round
   */
  private static createNextRound(tournament: LocalTournament): void {
    const currentRoundMatches = this.getMatchesForRound(tournament, tournament.currentRound);
    const winners = currentRoundMatches
      .filter(m => m.winner)
      .map(m => m.winner!);

    if (winners.length < 2) {
      console.error('Not enough winners to create next round');
      return;
    }

    tournament.currentRound++;
    const newMatches: LocalMatch[] = [];
    const matchCount = winners.length / 2;

    for (let i = 0; i < matchCount; i++) {
      newMatches.push({
        id: this.generateId(),
        round: tournament.currentRound,
        position: i,
        player1: winners[i * 2],
        player2: winners[i * 2 + 1],
        status: 'ready',
      });
    }

    tournament.bracket.push(...newMatches);
  }

  /**
   * Mark match as in progress
   */
  static markMatchInProgress(matchId: string): void {
    const tournament = this.getCurrentTournament();
    if (!tournament) return;

    const match = tournament.bracket.find(m => m.id === matchId);
    if (match) {
      match.status = 'in_progress';
      this.saveTournament(tournament);
    }
  }

  /**
   * Get total number of rounds for tournament size
   */
  static getTotalRounds(size: 4 | 8): number {
    return size === 4 ? 2 : 3; // 4 players = 2 rounds, 8 players = 3 rounds
  }

  /**
   * Get round name
   */
  static getRoundName(round: number, totalRounds: number): string {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi-Finals';
    if (round === totalRounds - 2) return 'Quarter-Finals';
    return `Round ${round}`;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
