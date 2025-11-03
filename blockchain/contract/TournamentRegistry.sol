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

	mapping(string => TournamentResult) public tournaments;
	
	string[] public tournamentIds;
	
	address public owner;
	
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
	}
}
