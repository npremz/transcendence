import { ethers } from 'ethers'
import { readFileSync } from 'fs'
import path from 'path'

interface TournamentResult {
	tournamentName: string
	maxPlayers: number
	winnerId: string
	winnerUsername: string
	timestamp: bigint
}

export class BlockchainService {
	private provider: ethers.JsonRpcProvider | null = null
	private contract: ethers.Contract | null = null
	private wallet: ethers.Wallet | null = null
	private contractAddress: string = ''
	private connected: boolean = false

	async initialize(): Promise<void> {
		try {
			const rpcUrl = process.env.FUJI_RPC_URL || process.env.AVALANCHE_RPC_URL || 'http://localhost:8545'
			const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY
			const contractAddr = process.env.BLOCKCHAIN_CONTRACT_ADDRESS

			if (!privateKey) {
				console.warn('BLOCKCHAIN_PRIVATE_KEY not set, blockchain service will run in read-only mode')
			}

			if (!contractAddr) {
				console.warn('BLOCKCHAIN_CONTRACT_ADDRESS not set, using default deployment')
			}

			this.provider = new ethers.JsonRpcProvider(rpcUrl)

			const contractPath = path.join('/blockchain/build/TournamentRegistry.json')
			let contractData: any

			try {
				const contractJson = readFileSync(contractPath, 'utf-8')
				contractData = JSON.parse(contractJson)
			} catch (error) {
				console.error('Could not load contract ABI from build folder')
				throw new Error('Contract ABI not found. Please compile the contract first.')
			}

			const abi = contractData.abi

			if (contractAddr) {
				this.contractAddress = contractAddr
			} else {
				this.contractAddress = contractData.contractAddress || ''
			}

			if (!this.contractAddress) {
				throw new Error('Contract address not found in environment or build file')
			}

			if (privateKey) {
				this.wallet = new ethers.Wallet(privateKey, this.provider)
				this.contract = new ethers.Contract(this.contractAddress, abi, this.wallet)
				console.log('Blockchain service initialized with wallet:', this.wallet.address)
			} else {
				this.contract = new ethers.Contract(this.contractAddress, abi, this.provider)
				console.log('Blockchain service initialized in read-only mode')
			}

			await this.provider.getNetwork()
			this.connected = true
			console.log('Successfully connected to blockchain at:', rpcUrl)
		} catch (error) {
			console.error('Failed to initialize blockchain service:', error)
			this.connected = false
		}
	}

	isConnected(): boolean {
		return this.connected
	}

	async registerTournament(
		tournamentId: string,
		tournamentName: string,
		maxPlayers: number,
		winnerId: string,
		winnerUsername: string
	): Promise<string> {
		if (!this.contract || !this.wallet) {
			throw new Error('Contract or wallet not initialized')
		}

		if (!this.connected) {
			throw new Error('Not connected to blockchain')
		}

		try {
			const tx = await this.contract.registerTournament(
				tournamentId,
				tournamentName,
				maxPlayers,
				winnerId,
				winnerUsername
			)

			console.log('Transaction sent:', tx.hash)
			const receipt = await tx.wait()
			console.log('Transaction confirmed in block:', receipt.blockNumber)

			return tx.hash
		} catch (error) {
			console.error('Error registering tournament on blockchain:', error)
			throw error
		}
	}

	async getTournament(tournamentId: string): Promise<TournamentResult | null> {
		if (!this.contract) {
			throw new Error('Contract not initialized')
		}

		try {
			const result = await this.contract.getTournament(tournamentId)
			
			return {
				tournamentName: result[0],
				maxPlayers: Number(result[1]),
				winnerId: result[2],
				winnerUsername: result[3],
				timestamp: result[4]
			}
		} catch (error) {
			console.error('Error fetching tournament from blockchain:', error)
			return null
		}
	}

	async getManyTournaments(tournamentIds: string[]): Promise<Array<{id: string, data: TournamentResult}>> {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        const promises = tournamentIds.map(async (id) => {
            try {
                const result = await this.contract!.getTournament(id);
                if (!result || result[0] === '') return null;

                return {
                    id,
                    data: {
                        tournamentName: result[0],
                        maxPlayers: Number(result[1]),
                        winnerId: result[2],
                        winnerUsername: result[3],
                        timestamp: result[4]
                    }
                };
            } catch (error) {
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter((item): item is {id: string, data: TournamentResult} => item !== null);
    }

	async getTournamentCount(): Promise<number> {
		if (!this.contract) {
			throw new Error('Contract not initialized')
		}

		try {
			const count = await this.contract.getTournamentCount()
			return Number(count)
		} catch (error) {
			console.error('Error fetching tournament count:', error)
			throw error
		}
	}
}
