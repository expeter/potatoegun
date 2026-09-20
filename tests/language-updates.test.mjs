import test from 'node:test';
import assert from 'node:assert/strict';
import {detectLanguage,setLanguage,getLanguage,t,locale} from '../game/src/i18n.mjs';
import {EN} from '../game/src/messages.mjs';
import {createUpdateChecker,validRelease} from '../game/src/updates.mjs';
import {REPLAY_ENGINE} from '../shared/replay.mjs';

test('language detection follows supported browser priorities and manual preference',()=>{
 assert.equal(detectLanguage(['fr-FR','de-AT','en-US']),'de');
 assert.equal(detectLanguage(['en-US','de-DE']),'en');
 assert.equal(detectLanguage(['de-DE'],'en'),'en');
 assert.equal(detectLanguage(['en-GB'],'de'),'de');
 assert.equal(detectLanguage(['fr','es']),'en');assert.equal(detectLanguage([]),'en');
 assert.equal(detectLanguage(['DE-de'],'bad'),'de');
});
test('both languages interpolate data without translating names or changing the engine',()=>{
 const engine=REPLAY_ENGINE;setLanguage('en');assert.equal(locale(),'en-GB');
 assert.equal(t`${1} Punkte frei`,'1 point available');assert.equal(t`${2} Punkte frei`,'2 points available');
 assert.equal(t('Talente'),'Talents');assert.equal(t`Wiederholung · ${'Talente'}`,'Replay · Talente');
 assert.equal(t`Schale ${27}%`,'Skin 27%');assert.equal(t('Schale 27%'),'Skin 27%');
 setLanguage('de');assert.equal(t('Skin 27%'),'Schale 27%');assert.equal(t('Talents'),'Talente');
 setLanguage('bogus');assert.equal(getLanguage(),'de');assert.equal(REPLAY_ENGINE,engine);
});
test('all translations preserve interpolation slots',()=>{
 for(const [de,en] of Object.entries(EN))assert.deepEqual([...de.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),[...en.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),de);
});
test('update checks are throttled, reject invalid manifests and recover from offline',async()=>{
 let time=0,calls=0,result={version:'0.7.0',build:'same'},seen=[];
 const check=createUpdateChecker({current:result,now:()=>time,fetchRelease:async()=>{calls++;if(result instanceof Error)throw result;return result;},available:v=>seen.push(v)});
 await check();assert.equal(calls,1);assert.equal(seen.length,0);
 await check();assert.equal(calls,1);
 time+=300000;result=Error('offline');await check();assert.equal(seen.length,0);
 time+=300000;result={version:'bad',build:'https://bad.invalid'};await check();assert.equal(seen.length,0);
 time+=300000;result={version:'0.8.0',build:'next'};await check();assert.equal(seen.length,1);
 time+=300000;await check();assert.equal(seen.length,1);
 assert.equal(validRelease({version:'0.8.0',build:'../../evil'}),false);
});
test('parallel update checks share one in-flight request',async()=>{
 let resolve,calls=0;const check=createUpdateChecker({current:{build:'old'},fetchRelease:()=>{calls++;return new Promise(r=>resolve=r);},available:()=>{}});
 const pending=check();await check();assert.equal(calls,1);resolve({version:'0.7.0',build:'new'});await pending;
});
