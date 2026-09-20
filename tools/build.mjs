import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function build() {
  const root = resolve(import.meta.dirname, '..');
  const out = resolve(root, '_site');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(resolve(root, 'game'), out, { recursive: true });
  await cp(resolve(root, 'shared'), resolve(out, 'shared'), { recursive: true });
  for (const name of await readdir(resolve(out, 'src'))) {
    if (!name.endsWith('.mjs')) continue;
    const path = resolve(out, 'src', name);
    await writeFile(path, (await readFile(path, 'utf8')).replaceAll('../../shared/', '../shared/'));
  }
  await cp(resolve(root, 'LICENSE'), resolve(out, 'LICENSE'));
  await writeFile(resolve(out, '.nojekyll'), '');
  return out;
}
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(await build());
