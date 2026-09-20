import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function dailyBackup(source, directory, keep = 7) {
  if (!Number.isInteger(keep) || keep < 1) throw Error('Backup retention must be positive.');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stem = `flights-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}-${randomUUID()}`;
  const pending = join(directory, `${stem}.pending`), target = join(directory, `${stem}.sqlite`);
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, pending);
    const snapshot = new DatabaseSync(pending, { readOnly: true });
    try { if (snapshot.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Backup integrity check failed.'); }
    finally { snapshot.close(); }
    await rename(pending, target);
  } finally { db.close(); await rm(pending, { force: true }); }
  // Only our dated snapshots are eligible; never delete databases, symlinks or unrelated files.
  const pattern = /^flights-\d{4}-\d{2}-\d{2}T\d{6}(?:\d{3})?Z(?:-[0-9a-f-]{36})?\.sqlite$/;
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && pattern.test(entry.name)) {
      const path = join(directory, entry.name);
      files.push({ path, time: (await stat(path)).mtimeMs });
    }
  }
  files.sort((a, b) => (b.path === target ? 1 : a.path === target ? -1 : b.time - a.time));
  for (const file of files.slice(keep)) await rm(file.path);
  return target;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [source, directory] = process.argv.slice(2);
  if (!source || !directory) throw Error('Usage: node api/daily-backup.mjs SOURCE.sqlite BACKUP_DIRECTORY');
  console.log(await dailyBackup(source, directory));
}
