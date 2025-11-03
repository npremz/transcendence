// scripts/deploy-contract.ts
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

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
const CONTRACT_BYTECODE = `6080604052348015600e575f5ffd5b503360025f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610f038061005c5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c806349524aad1461004e5780636ab5bddc1461007e5780638da5cb5b146100b45780639dde7448146100d2575b5f5ffd5b6100686004803603810190610063919061067d565b6100ee565b6040516100759190610718565b60405180910390f35b61009860048036038101906100939190610864565b610194565b6040516100ab97969594939291906108ef565b60405180910390f35b6100bc610419565b6040516100c991906109b7565b60405180910390f35b6100ec60048036038101906100e791906109fa565b61043e565b005b600181815481106100fd575f80fd5b905f5260205f20015f91509050805461011590610b0e565b80601f016020809104026020016040519081016040528092919081815260200182805461014190610b0e565b801561018c5780601f106101635761010080835404028352916020019161018c565b820191905f5260205f20905b81548152906001019060200180831161016f57829003601f168201915b505050505081565b5f818051602081018201805184825260208301602085012081835280955050505050505f91509050805f0180546101ca90610b0e565b80601f01602080910402602001604051908101604052809291908181526020018280546101f690610b0e565b80156102415780601f1061021857610100808354040283529160200191610241565b820191905f5260205f20905b81548152906001019060200180831161022457829003601f168201915b50505050509080600101805461025690610b0e565b80601f016020809104026020016040519081016040528092919081815260200182805461028290610b0e565b80156102cd5780601f106102a4576101008083540402835291602001916102cd565b820191905f5260205f20905b8154815290600101906020018083116102b057829003601f168201915b505050505090806002015f9054906101000a900460ff16908060030180546102f490610b0e565b80601f016020809104026020016040519081016040528092919081815260200182805461032090610b0e565b801561036b5780601f106103425761010080835404028352916020019161036b565b820191905f5260205f20905b81548152906001019060200180831161034e57829003601f168201915b50505050509080600401805461038090610b0e565b80601f01602080910402602001604051908101604052809291908181526020018280546103ac90610b0e565b80156103f75780601f106103ce576101008083540402835291602001916103f7565b820191905f5260205f20905b8154815290600101906020018083116103da57829003601f168201915b505050505090806005015490806006015f9054906101000a900460ff16905087565b60025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146104cd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104c490610b88565b60405180910390fd5b5f856040516104dc9190610be0565b90815260200160405180910390206006015f9054906101000a900460ff161561053a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161053190610c40565b60405180910390fd5b6040518060e001604052808681526020018581526020018460ff168152602001838152602001828152602001428152602001600115158152505f866040516105829190610be0565b90815260200160405180910390205f820151815f0190816105a39190610dfe565b5060208201518160010190816105b99190610dfe565b506040820151816002015f6101000a81548160ff021916908360ff16021790555060608201518160030190816105ef9190610dfe565b5060808201518160040190816106059190610dfe565b5060a0820151816005015560c0820151816006015f6101000a81548160ff0219169083151502179055509050505050505050565b5f604051905090565b5f5ffd5b5f5ffd5b5f819050919050565b61065c8161064a565b8114610666575f5ffd5b50565b5f8135905061067781610653565b92915050565b5f6020828403121561069257610691610642565b5b5f61069f84828501610669565b91505092915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f6106ea826106a8565b6106f481856106b2565b93506107048185602086016106c2565b61070d816106d0565b840191505092915050565b5f6020820190508181035f83015261073081846106e0565b905092915050565b5f5ffd5b5f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b610776826106d0565b810181811067ffffffffffffffff8211171561079557610794610740565b5b80604052505050565b5f6107a7610639565b90506107b3828261076d565b919050565b5f67ffffffffffffffff8211156107d2576107d1610740565b5b6107db826106d0565b9050602081019050919050565b828183375f83830152505050565b5f610808610803846107b8565b61079e565b9050828152602081018484840111156108245761082361073c565b5b61082f8482856107e8565b509392505050565b5f82601f83011261084b5761084a610738565b5b813561085b8482602086016107f6565b91505092915050565b5f6020828403121561087957610878610642565b5b5f82013567ffffffffffffffff81111561089657610895610646565b5b6108a284828501610837565b91505092915050565b5f60ff82169050919050565b6108c0816108ab565b82525050565b6108cf8161064a565b82525050565b5f8115159050919050565b6108e9816108d5565b82525050565b5f60e0820190508181035f830152610907818a6106e0565b9050818103602083015261091b81896106e0565b905061092a60408301886108b7565b818103606083015261093c81876106e0565b9050818103608083015261095081866106e0565b905061095f60a08301856108c6565b61096c60c08301846108e0565b98975050505050505050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6109a182610978565b9050919050565b6109b181610997565b82525050565b5f6020820190506109ca5f8301846109a8565b92915050565b6109d9816108ab565b81146109e3575f5ffd5b50565b5f813590506109f4816109d0565b92915050565b5f5f5f5f5f60a08688031215610a1357610a12610642565b5b5f86013567ffffffffffffffff811115610a3057610a2f610646565b5b610a3c88828901610837565b955050602086013567ffffffffffffffff811115610a5d57610a5c610646565b5b610a6988828901610837565b9450506040610a7a888289016109e6565b935050606086013567ffffffffffffffff811115610a9b57610a9a610646565b5b610aa788828901610837565b925050608086013567ffffffffffffffff811115610ac857610ac7610646565b5b610ad488828901610837565b9150509295509295909350565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610b2557607f821691505b602082108103610b3857610b37610ae1565b5b50919050565b7f4f6e6c79206f776e65722063616e2063616c6c207468697300000000000000005f82015250565b5f610b726018836106b2565b9150610b7d82610b3e565b602082019050919050565b5f6020820190508181035f830152610b9f81610b66565b9050919050565b5f81905092915050565b5f610bba826106a8565b610bc48185610ba6565b9350610bd48185602086016106c2565b80840191505092915050565b5f610beb8284610bb0565b915081905092915050565b7f546f75726e616d656e7420616c726561647920726567697374657265640000005f82015250565b5f610c2a601d836106b2565b9150610c3582610bf6565b602082019050919050565b5f6020820190508181035f830152610c5781610c1e565b9050919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f60088302610cba7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610c7f565b610cc48683610c7f565b95508019841693508086168417925050509392505050565b5f819050919050565b5f610cff610cfa610cf58461064a565b610cdc565b61064a565b9050919050565b5f819050919050565b610d1883610ce5565b610d2c610d2482610d06565b848454610c8b565b825550505050565b5f5f905090565b610d43610d34565b610d4e818484610d0f565b505050565b5b81811015610d7157610d665f82610d3b565b600181019050610d54565b5050565b601f821115610db657610d8781610c5e565b610d9084610c70565b81016020851015610d9f578190505b610db3610dab85610c70565b830182610d53565b50505b505050565b5f82821c905092915050565b5f610dd65f1984600802610dbb565b1980831691505092915050565b5f610dee8383610dc7565b9150826002028217905092915050565b610e07826106a8565b67ffffffffffffffff811115610e2057610e1f610740565b5b610e2a8254610b0e565b610e35828285610d75565b5f60209050601f831160018114610e66575f8415610e54578287015190505b610e5e8582610de3565b865550610ec5565b601f198416610e7486610c5e565b5f5b82811015610e9b57848901518255600182019150602085019450602081019050610e76565b86831015610eb85784890151610eb4601f891682610dc7565b8355505b6001600288020188555050505b50505050505056fea26469706673582212201a1a629b35bb2e46f934ff7000eaa6c9a058e6a2f5568dc57ffac64be2bf49da64736f6c634300081e0033`;

const CONTRACT_ABI = [
	{
		"inputs": [],
		"stateMutability":"nonpayable",
		"type":"constructor"
	},
	{
		"anonymous":false,
		"inputs":[
			{
				"indexed":true,
				"internalType":"string",
				"name":"tournamentId",
				"type":"string"
			},
			{
				"indexed":false,
				"internalType":"string",
				"name":"winnerId",
				"type":"string"
			},
			{
				"indexed":false,
				"internalType":"uint256",
				"name":"timestamp",
				"type":"uint256"
			}
		],
		"name":"TournamentRegistered",
		"type":"event"
	},
	{
		"inputs":[],
		"name":"owner",
		"outputs":[
			{
				"internalType":"address",
				"name":"",
				"type":"address"
			}
		],
		"stateMutability":"view",
		"type":"function"
	},
	{
		"inputs":[
			{
				"internalType":"string",
				"name":"_tournamentId",
				"type":"string"
			},
			{
				"internalType":"string",
				"name":"_tournamentName",
				"type":"string"
			},
			{
				"internalType":"uint8",
				"name":"_maxPlayers",
				"type":"uint8"
			},
			{
				"internalType":"string",
				"name":"_winnerId",
				"type":"string"
			},
			{
				"internalType":"string",
				"name":"_winnerUsername",
				"type":"string"
			}
		],
		"name":"registerTournament",
		"outputs":[],
		"stateMutability":"nonpayable",
		"type":"function"
	},
	{
		"inputs":[
			{
				"internalType":"uint256",
				"name":"",
				"type":"uint256"
			}
		],
		"name":"tournamentIds",
		"outputs":[
			{
				"internalType":"string",
				"name":"",
				"type":"string"
			}
		],
		"stateMutability":"view",
		"type":"function"
	},
	{
		"inputs":[
			{
				"internalType":"string",
				"name":"",
				"type":"string"
			}
		],
		"name":"tournaments",
		"outputs":[
			{
				"internalType":"string",
				"name":"tournamentId",
				"type":"string"
			},
			{
				"internalType":"string",
				"name":"tournamentName",
				"type":"string"
			},
			{
				"internalType":"uint8",
				"name":"maxPlayers",
				"type":"uint8"
			},
			{
				"internalType":"string",
				"name":"winnerId",
				"type":"string"
			},
			{
				"internalType":"string",
				"name":"winnerUsername",
				"type":"string"
			},
			{
				"internalType":"uint256",
				"name":"timestamp",
				"type":"uint256"
			},
			{
				"internalType":"bool",
				"name":"exists",
				"type":"bool"
			}
		],
		"stateMutability":"view",
		"type":"function"
	}
];

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
