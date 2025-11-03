// scripts/deploy-contract.ts
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as compiledContract from '../build/TournamentRegistry.json';

const NETWORKS = {
	fuji: {
		name: 'Avalanche Fuji Testnet',
		rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
		chainId: 43113,
		explorer: 'https://testnet.snowtrace.io'
	},
	mainnet: {
		name: 'Avalanche C-Chain',
		rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
		chainId: 43114,
		explorer: 'https://snowtrace.io'
	}
};

// Contract Bytecode
const CONTRACT_BYTECODE = compiledContract.bytecode
const CONTRACT_ABI = compiledContract.abi

/**
 * Fonction principale de déploiement
 */
async function deployContract(networkName: 'fuji' | 'mainnet') {
	console.log('\nStarting contract deployment...\n');
	
	// 1. Charger la configuration du réseau
	const network = NETWORKS[networkName];
	console.log(`Network: ${network.name}`);
	console.log(`RPC URL: ${network.rpcUrl}`);
	console.log(`Chain ID: ${network.chainId}\n`);
	
	// 2. Vérifier la clé privée
	const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
	if (!privateKey) {
		throw new Error('BLOCKCHAIN_PRIVATE_KEY not found in environment variables');
	}
	console.log(privateKey)
	
	// 3. Connexion au réseau
	console.log('Connecting to network...');
	const provider = new ethers.JsonRpcProvider(network.rpcUrl);
	const wallet = new ethers.Wallet(privateKey, provider);
	
	// 4. Vérifier le solde
	const balance = await provider.getBalance(wallet.address);
	console.log(`Wallet address: ${wallet.address}`);
	console.log(`💵 Balance: ${ethers.formatEther(balance)} AVAX\n`);
	
	if (balance === 0n) {
		console.log('WARNING: Wallet has zero balance!');
		if (networkName === 'fuji') {
			console.log('Get testnet AVAX from: https://faucet.avax.network/');
		}
		throw new Error('Insufficient balance');
	}
	
	// 5. Créer la factory du contrat
	console.log('Preparing contract deployment...');
	const factory = new ethers.ContractFactory(
		CONTRACT_ABI,
		CONTRACT_BYTECODE,
		wallet
	);
	
	// 6. Estimer le gas
	console.log('Estimating gas...');
	const deployTransaction = await factory.getDeployTransaction();
	const estimatedGas = await provider.estimateGas({
		...deployTransaction,
		from: wallet.address
	});
	
	const feeData = await provider.getFeeData();
	const estimatedCost = estimatedGas * (feeData.gasPrice || 0n);
	
	console.log(`Estimated gas: ${estimatedGas.toString()}`);
	console.log(`Estimated cost: ${ethers.formatEther(estimatedCost)} AVAX\n`);
	
	// 7. Déployer le contrat
	console.log('Deploying contract...');
	const contract = await factory.deploy();
	
	console.log(`Transaction sent: ${contract.deploymentTransaction()?.hash}`);
	console.log('Waiting for confirmation...\n');
	
	// 8. Attendre la confirmation
	await contract.waitForDeployment();
	const contractAddress = await contract.getAddress();
	
	// 9. Afficher les résultats
	console.log('Contract deployed successfully!\n');
	console.log('═'.repeat(60));
	console.log(`Contract Address: ${contractAddress}`);
	console.log(`Explorer: ${network.explorer}/address/${contractAddress}`);
	console.log(`Network: ${network.name}`);
	console.log('═'.repeat(60));
	
	// 10. Sauvegarder les informations
	const deploymentInfo = {
		network: networkName,
		contractAddress,
		deployedAt: new Date().toISOString(),
		deployer: wallet.address,
		transactionHash: contract.deploymentTransaction()?.hash,
		explorerUrl: `${network.explorer}/address/${contractAddress}`
	};
	
	const outputPath = path.join(__dirname, `deployment-${networkName}.json`);
	fs.writeFileSync(
		outputPath,
		JSON.stringify(deploymentInfo, null, 2)
	);
	
	console.log(`\nDeployment info saved to: ${outputPath}\n`);
	
	// 11. Instructions suivantes
	console.log('Next steps:');
	console.log('1. Add this to your .env file:');
	console.log(`   BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`);
	console.log(`   AVALANCHE_RPC_URL=${network.rpcUrl}`);
	console.log('2. Verify your contract on the explorer (optional)');
	console.log('3. Start using the contract in your application\n');
	
	return contractAddress;
}

/**
 * CLI Interface
 */
async function main() {
	const args = process.argv.slice(2);
	const networkArg = args[0];
	
	if (!networkArg || !['fuji', 'mainnet'].includes(networkArg)) {
		console.log('Usage: ts-node deploy-contract.ts <network>');
		console.log('Networks: fuji | mainnet');
		console.log('\nExample: ts-node deploy-contract.ts fuji');
		process.exit(1);
	}
	
	try {
		await deployContract(networkArg as 'fuji' | 'mainnet');
	} catch (error) {
		console.error('\n❌ Deployment failed:');
		console.error(error);
		process.exit(1);
	}
}

main();
