import { DatabaseSync, backup } from 'node:sqlite';
import { resolve } from 'node:path';
const [source, destination] = process.argv.slice(2);
if (!source || !destination || resolve(source) === resolve(destination)) throw Error('Usage: node api/backup.mjs SOURCE.sqlite NEW-BACKUP.sqlite');
const db = new DatabaseSync(source, { readOnly: true });
try { await backup(db, destination); } finally { db.close(); }
console.log(`Backup written to ${destination}`);
