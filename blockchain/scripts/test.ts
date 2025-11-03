import { ethers } from 'ethers';
import * as compiledContract from '../build/TournamentRegistry.json';
import * as deploymentInfo from './deployment-fuji.json';

async function testContract() {
	console.log('Testing deployed contract...\n');
	
	const provider = new ethers.JsonRpcProvider(
		'https://api.avax-test.network/ext/bc/C/rpc'
	);
	
	const wallet = new ethers.Wallet(
		process.env.BLOCKCHAIN_PRIVATE_KEY!,
		provider
	);
	
	const contract = new ethers.Contract(
		deploymentInfo.contractAddress,
		compiledContract.abi,
		wallet
	);
	
	// Enregistrer un tournoi
	console.log('Registering test tournament...');
	const tx = await contract.registerTournament(
		'test-tournament-1',
		'Test Tournament',
		8,
		'player-123',
		'TestWinner'
	);
	
	console.log(`Transaction: ${tx.hash}`);
	await tx.wait();
	console.log('✅ Tournament registered!\n');
	
	// Récupérer le tournoi
	console.log('Reading tournament data...');
	const tournament = await contract.getTournament('test-tournament-1');
	
	console.log('Tournament details:');
	console.log(`  Name: ${tournament[0]}`);
	console.log(`  Max Players: ${tournament[1]}`);
	console.log(`  Winner ID: ${tournament[2]}`);
	console.log(`  Winner Name: ${tournament[3]}`);
	console.log(`  Timestamp: ${new Date(Number(tournament[4]) * 1000).toISOString()}\n`);
	
	// Test 3: Compter les tournois
	const count = await contract.getTournamentCount();
	console.log(`Total tournaments: ${count}\n`);
	
	console.log('✅ All tests passed!');
}

testContract().catch(console.error);
