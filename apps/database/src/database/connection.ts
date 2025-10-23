import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

interface DatabaseInterface {
	connect(): Promise<void>;
	init(): Promise<void>;
	getDb(): sqlite3.Database;
}

class Database implements DatabaseInterface
{
	private db: sqlite3.Database | null = null;

	async connect(): Promise<void> 
	{
		const dbPath = path.join(__dirname, '../../data/transcendence.db');

		const dataDir = path.dirname(dbPath)
		if (!fs.existsSync(dataDir))
		{
			fs.mkdirSync(dataDir, {recursive: true})
		}

		return new Promise((resolve, reject) => {
			this.db = new sqlite3.Database(dbPath, (err: Error | null) => {
				if (err)
				{
					reject(err);
				}
				else
				{
					console.log('Connected to SQlite db');
					// Enable foreign key constraints
					this.db!.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
						if (pragmaErr)
						{
							console.error('Failed to enable foreign keys:', pragmaErr);
							reject(pragmaErr);
						}
						else
						{
							console.log('Foreign key constraints enabled');
							resolve();
						}
					});
				}
			})
		})
	}

	async init(): Promise<void>
	{
		if (!this.db)
		{
			throw new Error('Db not connected.');
		}

		const schemaPath = path.join(__dirname, 'schema.sql')
		const schema = fs.readFileSync(schemaPath, 'utf8')

		return new Promise((resolve, reject) => {
			this.db!.exec(schema, (err: Error | null) => {
				if (err)
				{
					reject(err)
				}
				else
				{
					console.log('Db schema initialized')
					resolve()
				}
			})
		})
	}

	getDb(): sqlite3.Database {
		if (!this.db)
		{
			throw new Error('Db not connected.');
		}
		return this.db
	}
}

export default new Database;
