import type { Room, Player } from "./types";
import { v4 as uuidv4 } from 'uuid'

export class RoomManager
{
	private rooms: Map<string, Room> = new Map();
	private waitingRoom: Room | null = null

	public findOrCreateRoom(player: Player) : Room
	{
		if (this.waitingRoom && this.waitingRoom.players.length === 1)
		{
			this.waitingRoom.players.push(player)
			player.roomId = this.waitingRoom.id

			const completedRoom = this.waitingRoom
			this.waitingRoom = null
			completedRoom.status = 'playing'

			this.rooms.set(completedRoom.id, completedRoom)

			console.log(`Room ${completedRoom.id} is complete with 2 players`)
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
