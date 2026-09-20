import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { request as httpRequest } from 'node:http';
import { dailyBackup } from '../api/daily-backup.mjs';
import { startReplay, advanceReplay } from '../shared/replay.mjs';
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
    const response=await post(app.origin,{replay:data,listed:false});assert.equal(response.status,200);const saved=await response.json();assert.match(saved.id,/^[\w-]{12}$/);assert.equal(saved.url,`https://potatoe.minizap.online/?flight=${saved.id}`);
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


test('API rejects reproducible flights with forged wind or locked talents',async()=>{
 const app=await open();try{
  for(const [equipment,wind] of [[{},999],[{rocket:3},undefined]]){
   const f=createFlight({angle:45,energy:70},equipment,{seed:42,windSeed:12,windTime:0,wind,traffic:true,level:'ground'});
   while(!f.ended)stepFlight(f);const data=captureReplay(f);
   const session=startReplay(data);while(!session.done)advanceReplay(session);assert.equal(session.matches,true,'Simulation consistency alone accepts this invalid setup');
   const response=await post(app.origin,{replay:data,listed:true});assert.equal(response.status,422);
  }
  assert.equal((await(await fetch(app.origin+'/v1/potatoe/leaderboard')).json()).flights.length,0);
 }finally{await app.close();}
});

test('storage quota rejects new records, preserves existing records and deduplicates at capacity',async()=>{
 const app=await open({maxFlights:1});try{
  const data=replay();const first=await(await post(app.origin,{replay:data,listed:false})).json();
  const second=await post(app.origin,{replay:replay(7),listed:false});assert.equal(second.status,503);assert.equal((await second.json()).error,'storage_full');
  assert.equal((await(await post(app.origin,{replay:data,listed:true})).json()).id,first.id);
  assert.equal((await fetch(app.origin+'/v1/potatoe/flights/'+first.id)).status,200);
 }finally{await app.close();}
});

test('SQLite page cap bounds growth without breaking reads',async()=>{
 const app=await open({maxDatabaseBytes:20480});try{
  let full=false;
  for(let i=0;i<8;i++){
   const data=replay(i+1);data.actions=Array.from({length:256},()=>[data.ticks,'boost']);
   const response=await post(app.origin,{replay:data,listed:false});
   if(response.status===503){assert.equal((await response.json()).error,'storage_full');full=true;break;}
   assert.equal(response.status,200);
  }
  assert.equal(full,true);assert.equal((await fetch(app.origin+'/health')).status,200);
 }finally{await app.close();}
});

test('forwarded addresses cannot bypass limits without proxy trust; malformed JSON is not echoed',async()=>{
 const app=await open({rateLimit:2});try{
  const bad=await post(app.origin,{}, {body:'SECRET_INVALID_JSON'});assert.equal(bad.status,422);assert.equal((await bad.text()).includes('SECRET_INVALID_JSON'),false);
  assert.equal((await fetch(app.origin+'/health',{headers:{'X-Forwarded-For':'198.51.100.1'}})).status,200);
  assert.equal((await fetch(app.origin+'/health',{headers:{'X-Forwarded-For':'198.51.100.2'}})).status,429);
 }finally{await app.close();}
});

test('concurrent slow bodies are bounded and slots recover after disconnect',async()=>{
 const app=await open({maxUploads:1,bodyTimeout:2000});let pending;
 try{
  pending=httpRequest(app.origin+'/v1/potatoe/flights',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':1000}});pending.on('error',()=>{});pending.write('{');
  await new Promise(r=>setTimeout(r,50));
  assert.equal((await post(app.origin,{replay:replay(),listed:false})).status,503);
  assert.equal((await fetch(app.origin+'/health')).status,200);
  pending.destroy();await new Promise(r=>setTimeout(r,50));
  assert.equal((await post(app.origin,{replay:replay(),listed:false})).status,200);
 }finally{pending?.destroy();await app.close();}
});

test('daily backups retain bounded verified snapshots and leave unrelated files alone',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'minizap-backups-'));const source=join(dir,'source.sqlite'),dest=join(dir,'snapshots');
 const db=new DatabaseSync(source);db.exec('CREATE TABLE evidence(value);INSERT INTO evidence VALUES(42)');db.close();
 try{
  await dailyBackup(source,dest,2);await writeFile(join(dest,'keep.txt'),'keep');
  await symlink(source,join(dest,'flights-2000-01-01T000000Z.sqlite'));
  await dailyBackup(source,dest,2);const newest=await dailyBackup(source,dest,2);
  const files=await readdir(dest,{withFileTypes:true});assert.equal(files.filter(f=>f.isFile()&&f.name.endsWith('.sqlite')).length,2);
  assert.ok(files.some(f=>f.name==='keep.txt'));assert.ok(files.some(f=>f.isSymbolicLink()));
  const copy=new DatabaseSync(newest,{readOnly:true});assert.equal(copy.prepare('SELECT value FROM evidence').get().value,42);copy.close();
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('chunked oversized requests cannot persist data or kill the service',async()=>{
 const app=await open();try{
  const status=await new Promise((resolve,reject)=>{
   const request=httpRequest(app.origin+'/v1/potatoe/flights',{method:'POST',headers:{'Content-Type':'application/json'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});
   request.on('error',error=>error.code==='ECONNRESET'?resolve('closed'):reject(error));
   request.write('x'.repeat(20000));request.end('x'.repeat(20000));
  });
  assert.ok(status===413||status==='closed');assert.equal((await fetch(app.origin+'/health')).status,200);
 }finally{await app.close();}
});

test('names and path injection stay data; responses carry safe JSON headers',async()=>{
 const app=await open();try{
  const data=replay();data.name="x');DROP TABLE flights;--";
  const response=await post(app.origin,{replay:data,listed:false});assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/^application\/json/);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  const saved=await response.json();const fetched=await(await fetch(app.origin+'/v1/potatoe/flights/'+saved.id)).json();assert.equal(fetched.replay.name,Array.from(data.name).slice(0,24).join(''));
  assert.equal((await fetch(app.origin+'/v1/potatoe/flights/'+encodeURIComponent("' OR 1=1--"))).status,404);
  assert.equal((await fetch(app.origin+'/health')).status,200);
 }finally{await app.close();}
});

test('tiny mobile rounding is accepted but leaderboard uses the server distance', async()=>{
  const app=await open();
  try {
    const original=replay(),rounded=structuredClone(original);rounded.result[5]+=5e-7;rounded.result[4]-=5e-7;
    const response=await post(app.origin,{replay:rounded,listed:true});assert.equal(response.status,200);
    const {id}=await response.json();
    const saved=await(await fetch(app.origin+'/v1/potatoe/flights/'+id)).json();
    assert.equal(saved.distance,original.result[5]);assert.notEqual(saved.distance,rounded.result[5]);
    const {flights}=await(await fetch(app.origin+'/v1/potatoe/leaderboard')).json();assert.equal(flights[0].distance,original.result[5]);
    for(const index of [5,7,8,10]){
      const changed=structuredClone(original);changed.result[index]+=.001;
      assert.equal((await post(app.origin,{replay:changed,listed:true})).status,422);
    }
  }finally{await app.close();}
});
