// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TournamentRegistry {
	struct TournamentResult {
		string tournamentId;
		string tournamentName;
		uint8 maxPlayers;
		string winnerId;
		string winnerUsername;
		uint256 timestamp;
		bool exists;
	}

	// Mapping tournamentId => TournamentResult
	mapping(string => TournamentResult) public tournaments;
	
	// Array pour lister tous les tournamentIds
	string[] public tournamentIds;
	
	// Owner du contrat
	address public owner;
	
	// Events pour tracer les actions
	event TournamentRegistered(
		string indexed tournamentId,
		string winnerId,
		uint256 timestamp
	);
	
	modifier onlyOwner() {
		require(msg.sender == owner, "Only owner can call this");
		_;
	}
	
	constructor() {
		owner = msg.sender;
	}
	
	/**
	 * Enregistre un résultat de tournoi
	 */
	function registerTournament(
		string memory _tournamentId,
		string memory _tournamentName,
		uint8 _maxPlayers,
		string memory _winnerId,
		string memory _winnerUsername
	) public onlyOwner {
		require(!tournaments[_tournamentId].exists, "Tournament already registered");
		
		tournaments[_tournamentId] = TournamentResult({
			tournamentId: _tournamentId,
			tournamentName: _tournamentName,
			maxPlayers: _maxPlayers,
			winnerId: _winnerId,
			winnerUsername: _winnerUsername,
			timestamp: block.timestamp,
			exists: true
		});
		
		tournamentIds.push(_tournamentId);
		
		emit TournamentRegistered(_tournamentId, _winnerId, block.timestamp);
	}
	
	/**
	 * Récupère un tournoi par son ID
	 */
	function getTournament(string memory _tournamentId) 
		public 
		view 
		returns (
			string memory tournamentName,
			uint8 maxPlayers,
			string memory winnerId,
			string memory winnerUsername,
			uint256 timestamp
		) 
	{
		require(tournaments[_tournamentId].exists, "Tournament not found");
		TournamentResult memory t = tournaments[_tournamentId];
		return (t.tournamentName, t.maxPlayers, t.winnerId, t.winnerUsername, t.timestamp);
	}
	
	/**
	 * Récupère le nombre total de tournois
	 */
	function getTournamentCount() public view returns (uint256) {
		return tournamentIds.length;
	}
	
	/**
	 * Récupère un tournamentId par index
	 */
	function getTournamentIdByIndex(uint256 index) public view returns (string memory) {
		require(index < tournamentIds.length, "Index out of bounds");
		return tournamentIds[index];
	}
}
