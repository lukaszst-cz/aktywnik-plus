'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const appSource=fs.readFileSync(path.join(root,'app.js'),'utf8');
const bootStart=appSource.indexOf('const localDataSafety=');
const bootEnd=appSource.indexOf('\nconst $=s=>',bootStart);
assert.ok(bootStart>=0&&bootEnd>bootStart,'journal guard must exist');
const bootSource=appSource.slice(bootStart,bootEnd);
const recoveryStart=appSource.indexOf('function emergencyRawForExport(){');
const recoveryEnd=appSource.indexOf('\nfunction renderLocalDataRecovery(){',recoveryStart);
assert.ok(recoveryStart>=0&&recoveryEnd>recoveryStart,'emergency backup guard must exist');
const recoverySource=appSource.slice(recoveryStart,recoveryEnd);

function mockStore(initial=null,readFails=false,writeFails=false){
  let value=initial;
  const stats={reads:0,writes:0};
  return {
    stats,
    getItem(){stats.reads++;if(readFails)throw Error('read denied');return value},
    setItem(_k,raw){stats.writes++;if(writeFails)throw Error('quota exceeded');value=raw},
    get raw(){return value},
    externalWrite(raw){value=raw}
  };
}
const validData={schemaVersion:6,profileMode:'self',meta:{},children:[{id:'p1'}],entries:[{id:'e1',childId:'p1'}]};
const integrityStart=appSource.indexOf('function assertUniqueBackupIds(');
const integrityEnd=appSource.indexOf('\nfunction backupStateFromPayload(',integrityStart);
assert.ok(integrityStart>=0&&integrityEnd>integrityStart,'identity validator must exist');
const validatorContext={
  BACKUP_VERSION:6,
  cleanText:(v,max=160)=>String(v??'').trim().slice(0,max),
  validUuid:v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''))
};
vm.createContext(validatorContext);
vm.runInContext(appSource.slice(integrityStart,integrityEnd)+';globalThis.verify=validateBackupIdentityIntegrity;',validatorContext);
function loadApp(store,normalizer=x=>x){
  let queued=0;
  const ctx={
    localStorage:store, KEY:'aktywnik-plus-data-v1',
    defaultState:{profileMode:'self',children:[],entries:[],meta:{}},
    structuredClone, today:()=> '2026-11-05',nowIso:()=> '2026-11-05T20:00:00.000Z',
    safeBackupState:normalizer,validateBackupIdentityIntegrity:validatorContext.verify,BACKUP_VERSION:6,renderAll(){},
    console:{error(){}},
    window:{AktywnikSync:{markDirty(){queued++}},AktywnikFamilySync:{markDirty(){queued++}}},
    parentUnlocked:()=>false
  };
  vm.createContext(ctx);
  vm.runInContext(bootSource+'\n'+recoverySource+
    '\n;globalThis.exposed={get state(){return state},get safety(){return localDataSafety},persist,load,writableLocalData,writeLocalJournal,emergencyRawForExport};',ctx);
  return {app:ctx.exposed,store,ctx,get queued(){return queued}};
}

test('fresh installation may create its first local record',()=>{
  const a=loadApp(mockStore());
  assert.equal(a.app.safety.locked,false);
  assert.equal(a.app.persist(),true);
  assert.equal(a.store.stats.writes,1);
  assert.equal(a.queued,1);
});
test('valid existing local journal retains entries and can persist',()=>{
  const a=loadApp(mockStore(JSON.stringify(validData)));
  assert.equal(a.app.safety.locked,false);
  assert.equal(a.app.state.entries[0].id,'e1');
  assert.equal(a.app.persist(),true);
  assert.equal(a.queued,1);
});
test('corrupted JSON cannot become a blank journal or sync snapshot',()=>{
  const a=loadApp(mockStore('{broken'));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.app.persist(),false);
  assert.equal(a.store.raw,'{broken');
  assert.equal(a.store.stats.writes,0);
  assert.equal(a.queued,0);
});
test('unexpected but parseable JSON is blocked',()=>{
  const a=loadApp(mockStore('{"strange":1}'));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.app.persist(),false);
  assert.equal(a.store.stats.writes,0);
});
test('unknown child id is not silently reassigned to another profile',()=>{
  const raw=JSON.stringify({...validData,entries:[{id:'e1',childId:'foreign-child'}]});
  const a=loadApp(mockStore(raw));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.app.persist(),false);
  assert.equal(a.store.raw,raw);
});
test('duplicate profile identities are rejected before sanitization',()=>{
  const raw=JSON.stringify({...validData,children:[{id:'p1'},{id:'p1'}]});
  const a=loadApp(mockStore(raw));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.store.stats.writes,0);
});
test('invalid cloud child reference is not silently dropped',()=>{
  const raw=JSON.stringify({...validData,children:[{id:'p1',cloudChildId:'untrusted-cloud-id'}]});
  const a=loadApp(mockStore(raw));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.store.stats.writes,0);
});
test('sanitizer discarding existing entries locks rather than overwrites',()=>{
  const raw=JSON.stringify(validData);
  const a=loadApp(mockStore(raw),x=>({...x,entries:[]}));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.app.persist(),false);
  assert.equal(a.store.raw,raw);
});
test('unavailable localStorage read disables writes',()=>{
  const a=loadApp(mockStore('important',true));
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.app.persist(),false);
  assert.equal(a.store.stats.writes,0);
});
test('failed localStorage write disables sync and subsequent writes',()=>{
  const a=loadApp(mockStore(null,false,true));
  assert.equal(a.app.persist(),false);
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.queued,0);
  assert.equal(a.app.persist(),false);
  assert.equal(a.store.stats.writes,1);
});
test('second tab modification causes fail-closed protection',()=>{
  const a=loadApp(mockStore(JSON.stringify(validData)));
  a.store.externalWrite('newer tab data');
  assert.equal(a.app.persist(),false);
  assert.equal(a.app.safety.locked,true);
  assert.equal(a.store.raw,'newer tab data');
  assert.equal(a.queued,0);
});
test('direct restore and merge writer cannot bypass the lock',()=>{
  const a=loadApp(mockStore('{broken'));
  assert.throws(()=>a.app.writeLocalJournal(validData),/zablokowany/);
  assert.equal(a.store.stats.writes,0);
});
test('family raw backup is never exposed without unlocked parent session',()=>{
  const family=JSON.stringify({...validData,profileMode:'family',parentAuth:{pinSalt:'some',pinHash:'hash'}});
  const a=loadApp(mockStore(family),()=>{throw Error('invalid fields')});
  assert.equal(a.app.emergencyRawForExport(),null);
  a.ctx.parentUnlocked=()=>true;
  assert.equal(a.app.emergencyRawForExport(),family);
});
test('personal raw backup may be recovered without family PIN',()=>{
  const raw=JSON.stringify(validData);
  const a=loadApp(mockStore(raw),()=>{throw Error('invalid fields')});
  assert.equal(a.app.emergencyRawForExport(),raw);
});
test('mislabelled personal record containing family PIN metadata cannot bypass parent authentication',()=>{
  const raw=JSON.stringify({...validData,profileMode:'self',parentAuth:{pinHash:'private-hash',pinSalt:'salt'}});
  const a=loadApp(mockStore(raw),()=>{throw Error('invalid fields')});
  assert.equal(a.app.emergencyRawForExport(),null);
});
test('unparseable raw journal is never exposed by the emergency UI',()=>{
  const a=loadApp(mockStore('{bad'));
  a.ctx.parentUnlocked=()=>true;
  assert.equal(a.app.emergencyRawForExport(),null);
});
test('startup import is guarded when the journal is unreadable',()=>{
  const code=fs.readFileSync(path.join(root,'app-import.js'),'utf8');
  assert.match(code,/async function restoreAtStartup\(file\)[\s\S]*?AktywnikDataSafety\?\.locked/);
  assert.match(code,/function commit\(\)[\s\S]*?AktywnikDataSafety\?\.locked/);
});
test('application direct writes use one guarded implementation',()=>{
  const writes=[...appSource.matchAll(/localStorage\.setItem\(KEY,/g)];
  assert.equal(writes.length,1,'all app.js journal saves must pass through writeLocalJournal');
  assert.match(appSource,/function applyBackupCandidate\(candidate\)\{\s*requireWritableLocalData\(\)/);
  assert.match(appSource,/function clearAllLocalUserData\(\)\{\s*requireWritableLocalData\(\)/);
  assert.match(appSource,/if\(localDataSafety\.locked\)\{renderLocalDataRecovery\(\);return\}/);
});
for(const filename of ['sync-client.js','family-sync-client.js']){
  test(filename+': fails closed on startup, dirty queue, deletion and sync',async()=>{
    const src=fs.readFileSync(path.join(root,filename),'utf8');
    const store=mockStore(JSON.stringify(validData));
    let sent=0;
    const win={AktywnikDataSafety:{locked:true},addEventListener(){}};
    const ctx={window:win,localStorage:store,document:{addEventListener(){}},navigator:{onLine:true},
      setTimeout(){return 1},clearTimeout(){},fetch(){sent++;throw Error('must not fetch')},console:{error(){}}};
    vm.runInNewContext(src,ctx,{filename});
    const api=filename==='sync-client.js'?win.AktywnikSync:win.AktywnikFamilySync;
    assert.ok(api);
    assert.equal(api.markDirty({...validData,profileMode:filename==='sync-client.js'?'self':'family'}),false);
    assert.equal(api.markDeleted('p1','e1','2026-11-05T20:00:00Z'),false);
    assert.equal(api.scrubStoredOutbox?api.scrubStoredOutbox():null,null);
    assert.equal(await api.syncNow(),false);
    assert.equal(sent,0);
    assert.equal(store.stats.writes,0);
  });
}
