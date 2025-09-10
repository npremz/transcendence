import sqlite3 from 'sqlite3'
import path, { resolve } from 'path'
import fs from 'fs'
import { rejects } from 'assert';

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
			this.db = new sqlite3.Database(dbPath, (err) => {
				if (err)
				{
					reject(err);
				}
				else
				{
					console.log('Connected to SQlite db');
					resolve();
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
			this.db!.exec(schema, (err) => {
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
