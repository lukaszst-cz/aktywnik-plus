import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../goal-sync.js',import.meta.url),'utf8');
const USER_A='90000000-0000-4000-8000-000000000001';
const USER_B='90000000-0000-4000-8000-000000000002';
const CHILD='c0000000-0000-4000-8000-000000000001';
const store=new Map([['aktywnik-plus-goal-sync-account-v1',USER_A]]);
const rows=[];
let actor=USER_A;
const patch=[];
const statusNode={textContent:'',dataset:{}};
const win={
  AKTYWNIK_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',publishableKey:'public-key'},
  AktywnikAuth:{
    validSession:async()=>({access_token:'test-access'}),
    currentUser:async()=>({id:actor,email:'fixture@example.test'})
  },
  AktywnikMotivationBridge:{
    snapshot:()=>({profileMode:'self',children:[{
      id:CHILD,cloudChildId:null,
      motivationGoals:{7:120,14:0,21:0,month:0},
      motivationGoalUpdatedAt:{7:'2026-11-02T10:00:00.000Z'}
    }]}),
    mergeCloudGoals:entries=>{patch.push(...entries);}
  },
  addEventListener(){}
};
const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
const document={
  readyState:'loading',
  addEventListener(){},
  getElementById:id=>id==='motivationCloudStatus'?statusNode:null
};
const response=(status,body)=>({ok:status>=200&&status<300,status,async text(){return body==null?'':JSON.stringify(body);}});
const requests=[];
const fetch=async(url,opts)=>{
  requests.push({url,opts});
  if(opts.method==='GET')return response(200,rows);
  if(opts.method==='POST'){
    const body=JSON.parse(opts.body);
    for(const item of body)rows.push({...item});
    return response(201,null);
  }
  throw Error('Unexpected request');
};
vm.runInNewContext(source,{
  window:win,document,localStorage,fetch,navigator:{onLine:true},
  Date,Math,Object,Number,RegExp,String,Set,Map,Array,URLSearchParams,
  setTimeout:()=>1,clearTimeout(){},confirm:()=>true
},{filename:'goal-sync.js'});
const goals=win.AktywnikGoalSync;
assert.equal(goals.profileKey({cloudChildId:CHILD},'family'),'family:'+CHILD);
assert.equal(goals.profileKey({cloudChildId:'invalid'},'family'),null);
assert.equal(goals.profileKey(null,'self'),'self');
assert.equal(goals.goalsFromState().length,1);
assert.equal(await goals.syncNow(),true);
assert.equal(rows.length,1);
assert.equal(rows[0].owner_id,USER_A);
assert.equal(rows[0].target_minutes,120);
assert.deepEqual(Object.keys(rows[0]).sort(),['changed_at','owner_id','period','profile_key','target_minutes']);
assert.ok(statusNode.textContent.includes('zsynchronizowane'));
actor=USER_B;
const before=requests.length;
assert.equal(await goals.syncNow(),false,'Must reject a different logged-in account');
assert.equal(requests.length,before,'Must not send a single request to the cloud under a different account');
assert.ok(statusNode.textContent.includes('inne konto'));
console.log('PASS: goal sync payload minimized, account isolation, cloud pull/push, family key');
