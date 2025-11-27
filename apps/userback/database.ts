import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'users.db');
const SCHEMA_PATH = path.join(process.cwd(), 'dbuser', 'schema.sql');

export async function initDatabase(): Promise<sqlite3.Database> {
	await fs.promises.mkdir(DATA_DIR, { recursive: true });

	const db = new sqlite3.Database(DB_FILE);
	await applySchema(db);

	return db;
}

export function closeDatabase(db: sqlite3.Database): Promise<void> {
	return new Promise((resolve, reject) => {
		db.close((err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

async function applySchema(db: sqlite3.Database): Promise<void> {
	const schema = await fs.promises.readFile(SCHEMA_PATH, 'utf-8');

	return new Promise((resolve, reject) => {
		db.exec(schema, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}
