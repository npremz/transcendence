import type { Room, Player } from "./types";
import { v4 as uuidv4 } from 'uuid'

export class RoomManager
{
	private rooms: Map<string, Room> = new Map();
	private waitingRoom: Room | null = null;
	private pendingPlayers: Map<string, number> = new Map(); // playerId -> timestamp

	public findOrCreateRoom(player: Player) : Room | { error: string }
	{
		// Vérifier si le joueur a déjà une requête en cours (race condition protection)
		const now = Date.now();
		const pendingTimestamp = this.pendingPlayers.get(player.id);
		if (pendingTimestamp && (now - pendingTimestamp) < 5000) {
			console.log(`⛔ Player ${player.username} (${player.id}) has a pending request (race condition detected)`);
			return { error: 'request_in_progress' };
		}

		// Marquer le joueur comme ayant une requête en cours
		this.pendingPlayers.set(player.id, now);

		// Nettoyer les anciennes entrées (plus de 10 secondes)
		for (const [id, timestamp] of this.pendingPlayers.entries()) {
			if (now - timestamp > 10000) {
				this.pendingPlayers.delete(id);
			}
		}

		// Vérifier si le joueur est déjà dans la waitingRoom
		if (this.waitingRoom && this.waitingRoom.players.some(p => p.username === player.username))
		{
			this.pendingPlayers.delete(player.id);
			console.log(`⛔ Player ${player.username} (${player.id}) is already in waiting room ${this.waitingRoom.id}`);
			return { error: 'already_in_queue' };
		}

		// Vérifier si le joueur est déjà dans une autre room active
		for (const [roomId, room] of this.rooms)
		{
			const existing = room.players.find(p => p.username === player.username);
			if (existing)
			{
				this.pendingPlayers.delete(player.id);
				console.log(`⛔ Player ${player.username} (${player.id}) is already in an active game (room ${roomId})`);
				return { error: 'already_in_game' };
			}
		}

		if (this.waitingRoom && this.waitingRoom.players.length === 1)
		{
			// Vérifier que ce n'est pas le même joueur
			const waitingPlayer = this.waitingRoom.players[0];
			if (waitingPlayer.username === player.username) {
				this.pendingPlayers.delete(player.id);
				console.log(`⛔ Player ${player.username} (${player.id}) tried to match with themselves`);
				return { error: 'cannot_play_yourself' };
			}

			this.waitingRoom.players.push(player)
			player.roomId = this.waitingRoom.id

			const completedRoom = this.waitingRoom
			this.waitingRoom = null
			completedRoom.status = 'playing'

			this.rooms.set(completedRoom.id, completedRoom)

			// Retirer les deux joueurs des requêtes en cours
			this.pendingPlayers.delete(waitingPlayer.id);
			this.pendingPlayers.delete(player.id);

			console.log(`✅ Room ${completedRoom.id} is complete with 2 players: ${waitingPlayer.username} vs ${player.username}`)
			return completedRoom
		}

		const newRoom: Room = {
			id: uuidv4(),
			players: [player],
			status: 'waiting',
			createdAt: new Date()
		}

		player.roomId = newRoom.id
		this.rooms.set(newRoom.id, newRoom)
		this.waitingRoom = newRoom

		console.log(`Created new room ${newRoom.id}, waiting for a second player...`)
		return newRoom
	}

	public createTournamentRoom(
        roomId: string, 
        player1: Player, 
        player2: Player,
        tournamentId: string,
        matchId: string
    ): Room {
        const room: Room = {
            id: roomId,
            players: [
				{ ...player1, selectedSkill: player1.selectedSkill || 'smash' },
				{ ...player2, selectedSkill: player2.selectedSkill || 'smash' }
			],
            status: 'playing',
            createdAt: new Date(),
            isTournament: true,
            tournamentId,
            matchId
        };

        this.rooms.set(room.id, room);
        console.log(`Tournament room ${roomId} created for match ${matchId}`);
        return room;
    }

	public deleteRoom(roomId: string): boolean
	{
		const room = this.rooms.get(roomId);
		if (!room)
		{
			console.log(`deleteRoom: room ${roomId} not found`);
			if (this.waitingRoom?.id === roomId)
			{
				this.waitingRoom = null;
			}
			return false;
		}

		this.rooms.delete(roomId);

		if (this.waitingRoom?.id === roomId)
		{
			this.waitingRoom = null;
		}

		console.log(`Room ${roomId} deleted (room-finished received)`);
		this.debugRooms();
		return true;
	}

	public getRoom(roomId: string): Room | undefined
	{
		return (this.rooms.get(roomId))
	}

	public removePlayerFromRoom(player: Player): void
	{
		if (!player.roomId) return

		const room = this.rooms.get(player.roomId)
		if (!room) return

		room.players = room.players.filter(p => p.id !== player.id)
		console.log(`Player ${player.username} removed from the room`)

		if (room.players.length === 0 && room.status === 'waiting')
		{
			this.rooms.delete(room.id)
			if (this.waitingRoom?.id === room.id)
			{
				this.waitingRoom = null
			}
			console.log(`Room ${room.id} deleted (empty)`)
		}
		else if (room.players.length === 1)
		{
			const remainingPlayer = room.players[0]

			room.status = 'waiting'
			this.waitingRoom = room
			console.log(`Room ${room.id} waiting for a new player (one disconnected)`)
		}
	}

	public debugRooms(): void
	{
		console.log('=== ÉTAT DES ROOMS ===');
		console.log(`Rooms actives: ${this.rooms.size}`);
		console.log(`Room en attente: ${this.waitingRoom?.id || 'aucune'}`);
		this.rooms.forEach(room => {
			const playerNames = room.players.map(p => p.username).join(', ');
			console.log(`Room ${room.id}:`);
			console.log(`  - Joueurs (${room.players.length}): ${playerNames}`);
			console.log(`  - Status: ${room.status}`);
			console.log(`  - Créée il y a: ${Math.round((Date.now() - room.createdAt.getTime()) / 1000)}s`);
		});
		console.log('=====================');
	}
}
