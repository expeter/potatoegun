import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeaderboardFeed } from '../game/src/leaderboard-feed.mjs';
const score = (n, distance = n * 100) => ({ id: `test${String(n).padStart(8,'0')}`, name: `Pilot ${n}`, distance });
function harness() {
  let time = 0, visible = true, body = { flights: [score(1)] }, calls = 0;
  const notices = [], states = [];
  const feed = createLeaderboardFeed({ now: () => time, active: () => visible,
    fetchScores: async () => { calls++; if(body instanceof Error) throw body; return body; },
    announce: notice => notices.push(notice), changed: state => states.push(state) });
  return { feed, notices, states, tick: ms => time += ms, body: value => body=value,
    visible: value => visible=value, calls: () => calls };
}
test('first snapshot is silent; homepage/menu refreshes share a ten-second budget', async () => {
  const h=harness();await h.feed.refresh();assert.equal(h.notices.length,0);
  await h.feed.refresh();h.tick(9999);await h.feed.refresh();assert.equal(h.calls(),1);
  h.tick(1);h.body({flights:[score(2),score(1)]});await h.feed.refresh();
  assert.equal(h.calls(),2);assert.equal(h.notices.length,1);assert.equal(h.notices[0].score.id,score(2).id);
  assert.equal(h.notices[0].worldBest,true);
});
test('bursts become one highest-distance notice; known IDs and reordered entries stay silent', async () => {
  const h=harness();h.body({flights:[score(1,1000)]});await h.feed.refresh();h.tick(10000);
  h.body({flights:[score(4,350),score(1,1000),score(2,250),score(3,300)]});await h.feed.refresh();
  assert.equal(h.notices.length,1);assert.equal(h.notices[0].count,3);assert.equal(h.notices[0].score.id,score(4).id);
  assert.equal(h.notices[0].worldBest,false);h.tick(10000);await h.feed.refresh();assert.equal(h.notices.length,1);
  h.body({flights:[]});h.tick(10000);await h.feed.refresh();h.body({flights:[score(1,1000),score(4,350)]});h.tick(10000);await h.feed.refresh();assert.equal(h.notices.length,1);
});
test('parallel requests and repeated upload invalidations coalesce without overlapping', async () => {
  let time=0,calls=0,resolveRequest;
  const feed=createLeaderboardFeed({now:()=>time,fetchScores:()=>{calls++;return new Promise(resolve=>resolveRequest=resolve);}});
  const pending=feed.refresh();await Promise.resolve();const second=feed.refresh();assert.equal(second,pending);assert.equal(calls,1);
  feed.invalidate();feed.invalidate();resolveRequest({flights:[score(1)]});await pending;await Promise.resolve();assert.equal(calls,2);
  const followup=feed.refresh();resolveRequest({flights:[score(1)]});await followup;time=9999;await feed.refresh();assert.equal(calls,2);
});
test('hidden tabs make no requests; resume and in-flight background responses form silent baselines', async () => {
  const h=harness();await h.feed.refresh();h.visible(false);h.tick(100000);h.body({flights:[score(2),score(1)]});await h.feed.refresh();assert.equal(h.calls(),1);
  h.feed.pause();h.visible(true);await h.feed.resume();assert.equal(h.calls(),2);assert.equal(h.notices.length,0);
  h.tick(10000);h.body({flights:[score(3),score(2),score(1)]});await h.feed.refresh();assert.equal(h.notices.length,1);
  let resolveRequest,active=true;
  const notices=[];const feed=createLeaderboardFeed({active:()=>active,fetchScores:()=>new Promise(resolve=>resolveRequest=resolve),announce:n=>notices.push(n)});
  const pending=feed.refresh();await Promise.resolve();active=false;feed.pause();resolveRequest({flights:[score(9)]});await pending;assert.equal(notices.length,0);
});
test('offline/malformed responses retain global data, back off and avoid reconnect notification floods', async () => {
  const h=harness();await h.feed.refresh();h.tick(10000);h.body(Error('offline'));await h.feed.refresh();
  assert.equal(h.feed.snapshot().scores[0].id,score(1).id);assert.equal(h.feed.snapshot().error,true);
  h.tick(19999);await h.feed.refresh();assert.equal(h.calls(),2);h.tick(1);h.body({wrong:[]});await h.feed.refresh();assert.equal(h.calls(),3);
  h.tick(39999);await h.feed.refresh();assert.equal(h.calls(),3);h.tick(1);h.body({flights:[score(2),score(1)]});await h.feed.refresh();assert.equal(h.notices.length,0);assert.equal(h.feed.snapshot().error,false);
  h.tick(10000);h.body({flights:[score(3),score(2),score(1)]});await h.feed.refresh();assert.equal(h.notices.length,1);
});
test('invalid entries are rejected, names bounded and IDs deduplicated',async()=>{
  const h=harness();h.body({flights:[null,{...score(1),id:'../../unsafe'},score(2),score(2),{...score(3),distance:Infinity},{...score(4),distance:-1},{...score(5),name:'<b>\n'+'M'.repeat(40)}]});await h.feed.refresh();
  assert.equal(h.feed.snapshot().scores.length,2);assert.equal(h.feed.snapshot().scores[0].name.length,24);assert.ok(!h.feed.snapshot().scores[0].name.includes('\n'));
});
test('rapid own-upload refreshes respect the notice budget and phrases cycle without a backlog',async()=>{
  const h=harness();await h.feed.refresh();
  for(let i=2;i<=8;i++){h.tick(10000);h.body({flights:[score(i),score(1)]});await h.feed.invalidate();}
  assert.deepEqual(h.notices.map(n=>n.variant),[0,1,2,3,4,5,0]);
  h.tick(1);h.body({flights:[score(9),score(1)]});await h.feed.invalidate();assert.equal(h.notices.length,7);
  h.tick(10000);await h.feed.refresh();assert.equal(h.notices.length,7,'A suppressed entry is never queued for later');
});
