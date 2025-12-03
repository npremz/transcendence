import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'users.db');
const SCHEMA_PATH = path.join(process.cwd(), 'dbuser', 'schema.sql');

export async function initDatabase(): Promise<sqlite3.Database> {
	console.log('[DEBUG] Creating data directory...');
	await fs.promises.mkdir(DATA_DIR, { recursive: true });

	console.log('[DEBUG] Opening database file:', DB_FILE);
	const db = new sqlite3.Database(DB_FILE);

	console.log('[DEBUG] Applying schema...');
	await applySchema(db);
	console.log('[DEBUG] Schema applied successfully');

	console.log('[DEBUG] Adding avatar column if needed...');
	await new Promise<void>((resolve) => {
        db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`, (err) => {
            // Si erreur, c'est probablement qu'elle existe déjà, on ignore
            console.log('[DEBUG] Avatar column added or already exists');
            resolve();
        });
    });

	console.log('[DEBUG] Database initialization complete');
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
	console.log('[DEBUG] Reading schema from:', SCHEMA_PATH);
	const schema = await fs.promises.readFile(SCHEMA_PATH, 'utf-8');
	console.log('[DEBUG] Schema read, length:', schema.length, 'bytes');

	return new Promise((resolve, reject) => {
		console.log('[DEBUG] Executing schema SQL...');
		db.exec(schema, (err) => {
			if (err) {
				console.error('[ERROR] Schema execution failed:', err);
				reject(err);
			} else {
				console.log('[DEBUG] Schema execution completed');
				resolve();
			}
		});
	});
}
