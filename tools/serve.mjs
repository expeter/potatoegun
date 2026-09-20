import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { build } from './build.mjs';
import { createApi } from '../api/server.mjs';
const root = await build();
const port = Number(process.env.PORT || 8000);
const origin = `http://localhost:${port}`;
const api = createApi({ dbPath: process.env.DB_PATH || './data/development.sqlite', gameOrigin: origin, origins: [origin, `http://127.0.0.1:${port}`] });
const staticServer = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) { req.url=req.url.slice(4);api.emit('request',req,res);return; }
  try {
    let pathname=decodeURIComponent(new URL(req.url, origin).pathname);
    if (/^\/f\/[^/]+\/?$/.test(pathname)) pathname='/index.html';
    const file=resolve(root, `.${pathname.endsWith('/')?pathname+'index.html':pathname}`);
    if (!file.startsWith(root+'/')) {res.writeHead(403).end();return;}
    const body=await readFile(file);
    res.writeHead(200, {'Content-Type':{'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'}[extname(file)]||'application/octet-stream'}).end(body);
  } catch {res.writeHead(404).end('Not found');}
});
staticServer.listen(port, '127.0.0.1',()=>console.log(`Game + API: ${origin}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>staticServer.close(()=>{api.emit('close');}));
