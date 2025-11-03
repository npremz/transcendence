// scripts/compile.ts
import * as solc from 'solc';
import * as fs from 'fs';
import * as path from 'path';

function findImports(importPath: string) {
	try {
		const contractsDir = path.join(__dirname, '../contract');
		const filePath = path.join(contractsDir, importPath);
		return {
			contents: fs.readFileSync(filePath, 'utf8')
		};
	} catch (error) {
		return { error: 'File not found' };
	}
}

function compileContract() {
	console.log('Compiling TournamentRegistry.sol...\n');
	const contractPath = path.join(__dirname, '../contract/TournamentRegistry.sol');
	const sourceCode = fs.readFileSync(contractPath, 'utf8');
	
	const input = {
		language: 'Solidity',
		sources: {
			'TournamentRegistry.sol': {
				content: sourceCode
			}
		},
		settings: {
			outputSelection: {
				'*': {
					'*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode']
				}
			},
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	};
	
	const output = JSON.parse(
		solc.compile(JSON.stringify(input), { import: findImports })
	);

	if (output.errors) {
		let hasError = false;
		output.errors.forEach((error: any) => {
			if (error.severity === 'error') {
				console.error('Error:', error.formattedMessage);
				hasError = true;
			} else {
				console.warn('Warning:', error.formattedMessage);
			}
		});
		
		if (hasError) {
			throw new Error('Compilation failed');
		}
	}
	
	const contract = output.contracts['TournamentRegistry.sol']['TournamentRegistry'];
	
	if (!contract) {
		throw new Error('Contract not found in compilation output');
	}
	
	const compiledContract = {
		abi: contract.abi,
		bytecode: '0x' + contract.evm.bytecode.object
	};
	
	const buildDir = path.join(__dirname, '../build');
	if (!fs.existsSync(buildDir)) {
		fs.mkdirSync(buildDir, { recursive: true });
	}

	const outputPath = path.join(buildDir, 'TournamentRegistry.json');
	fs.writeFileSync(
		outputPath,
		JSON.stringify(compiledContract, null, 2)
	);
	
	console.log('✅ Compilation successful!');
	console.log(`Output: ${outputPath}`);
	console.log(`ABI entries: ${compiledContract.abi.length}`);
	console.log(`Bytecode length: ${compiledContract.bytecode.length} characters\n`);
	
	return compiledContract;
}

try {
	compileContract();
} catch (error) {
	console.error('Compilation failed:', error);
	process.exit(1);
}
