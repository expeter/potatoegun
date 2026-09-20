import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createApi } from '../api/server.mjs';
import { createFlight, stepFlight } from '../shared/physics.mjs';
import { captureReplay } from '../shared/replay.mjs';
function replay(seed=42, traffic=true) {
  const f=createFlight({angle:45,energy:70},{},{seed,windSeed:12,windTime:0,traffic,level:'ground'});
  while(!f.ended)stepFlight(f);
  return captureReplay(f);
}
async function open(options={}) {
  const server=createApi(options);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {server, origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
const post=(origin,data,extra={})=>fetch(origin+'/v1/potatoe/flights',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),...extra});
test('verified flights persist, deduplicate, list explicitly, rank and survive restart', async()=>{
  const dir=await mkdtemp(join(tmpdir(),'minizap-api-'));
  let app=await open({dbPath:join(dir,'flights.sqlite')});
  try{
    const data=replay();
    const response=await post(app.origin,{replay:data,listed:false});assert.equal(response.status,200);const saved=await response.json();assert.match(saved.id,/^[\w-]{12}$/);
    assert.equal((await (await fetch(app.origin+'/v1/potatoe/leaderboard')).json()).flights.length,0);
    const duplicate=await (await post(app.origin,{replay:data,listed:true})).json();assert.equal(duplicate.id,saved.id);
    const [a,b]=await Promise.all([post(app.origin,{replay:replay(7),listed:true}),post(app.origin,{replay:replay(7),listed:true})]);assert.equal((await a.json()).id,(await b.json()).id);
    const board=(await (await fetch(app.origin+'/v1/potatoe/leaderboard')).json()).flights;assert.equal(board.length,2);assert.ok(board[0].distance>=board[1].distance);
    execFileSync(process.execPath,['api/backup.mjs',join(dir,'flights.sqlite'),join(dir,'backup.sqlite')]);
    const backupDb=new DatabaseSync(join(dir,'backup.sqlite'),{readOnly:true});
    assert.equal(backupDb.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(backupDb.prepare('SELECT count(*) AS count FROM flights').get().count,2);backupDb.close();
    await app.close();app=await open({dbPath:join(dir,'backup.sqlite')});
    const loaded=await (await fetch(app.origin+'/v1/potatoe/flights/'+saved.id)).json();assert.deepEqual(loaded.replay,data);assert.equal(loaded.distance,data.result[5]);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
test('invalid, forged, unsupported, oversized and cross-origin submissions are rejected',async()=>{
 const app=await open();try{
  const data=replay();const forged=structuredClone(data);forged.result[5]+=10;
  for(const body of [{replay:forged,listed:true},{replay:{...data,engine:'old'},listed:true},{replay:data},{replay:replay(1,false),listed:true}])assert.equal((await post(app.origin,body)).status,422);
  assert.equal((await post(app.origin,{replay:data,listed:false},{headers:{'Content-Type':'application/json',Origin:'https://evil.invalid'}})).status,403);
  assert.equal((await post(app.origin,{padding:'x'.repeat(33000)})).status,413);
  assert.equal((await post(app.origin,{}, {headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await fetch(app.origin+'/v1/potatoe/flights/bad')).status,404);
  assert.equal((await fetch(app.origin+'/v1/potatoe/flights/abcdefghijkl')).status,404);
  const pre=await fetch(app.origin+'/v1/potatoe/flights',{method:'OPTIONS',headers:{Origin:'https://potatoe.minizap.online'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),'https://potatoe.minizap.online');
 }finally{await app.close();}
});
test('rate limits return retry instructions; health remains responsive during validation',async()=>{
 const app=await open({rateLimit:2});try{
  const pending=post(app.origin,{replay:replay(),listed:false});
  assert.equal((await fetch(app.origin+'/health')).status,200);assert.equal((await pending).status,200);
  const blocked=await fetch(app.origin+'/health');assert.equal(blocked.status,429);assert.equal(blocked.headers.get('Retry-After'),'60');
 }finally{await app.close();}
});

test('verification timeout is bounded and the service recovers',async()=>{
 const app=await open({verifyTimeout:1});try{
  const result=await post(app.origin,{replay:replay(),listed:false});assert.equal(result.status,422);assert.equal((await result.json()).error,'verification_timeout');
  assert.equal((await fetch(app.origin+'/health')).status,200);
 }finally{await app.close();}
});
