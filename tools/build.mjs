import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function build() {
  const root = resolve(import.meta.dirname, '..');
  const out = resolve(root, '_site');
  const release=JSON.parse(await readFile(resolve(root,'game/version.json'),'utf8'));
  const build=process.env.GITHUB_SHA || release.build;
  if(!/^[a-zA-Z0-9._-]{1,64}$/.test(build))throw Error('Invalid build ID');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(resolve(root, 'game'), out, { recursive: true });
  await cp(resolve(root, 'shared'), resolve(out, 'shared'), { recursive: true });
  for (const folder of ['src','shared']) for (const name of await readdir(resolve(out, folder))) {
    if (!name.endsWith('.mjs')) continue;
    const path = resolve(out, folder, name);
    await writeFile(path, (await readFile(path, 'utf8')).replaceAll('../../shared/', '../shared/').replace(/\.mjs(['"])/g, `.mjs?v=${build}$1`));
  }
  for(const name of ['index.html','verify.html']) {
    const path=resolve(out,name);
    await writeFile(path,(await readFile(path,'utf8')).replaceAll('__BUILD__',build).replaceAll('__VERSION__',release.version));
  }
  await writeFile(resolve(out,'version.json'),JSON.stringify({version:release.version,build}));
  await cp(resolve(root, 'LICENSE'), resolve(out, 'LICENSE'));
  await writeFile(resolve(out, '.nojekyll'), '');
  return out;
}
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(await build());
