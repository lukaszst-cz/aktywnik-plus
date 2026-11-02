// Isolated auth smoke tests (no real accounts or Supabase traffic).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../auth.js',import.meta.url),'utf8');
function harness(fetchImpl){
  const values=new Map();
  const localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key)
  };
  const window={
    AKTYWNIK_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test',redirectPath:'/konto.html'},
    addEventListener(){},
    dispatchEvent(){},
    AktywnikSync:{renderStatus(){}},
    AktywnikFamilySync:{renderStatus(){}}
  };
  const location={origin:'https://aktywnik.example',hash:'',pathname:'/konto.html',search:'',assign(url){this.redirect=url}};
  const context={
    window,document:{querySelector(){return null},addEventListener(){}},
    localStorage,location,history:{replaceState(){}},
    fetch:fetchImpl,URL,URLSearchParams,Date,JSON,Error,Number,String,
    Event:class Event{constructor(name){this.type=name}},
    setTimeout,clearTimeout,AbortController,
    navigator:{onLine:true},
    console:{warn(){},error(){}}
  };
  vm.runInNewContext(source,context,{filename:'auth.js'});
  return {auth:window.AktywnikAuth,storage:localStorage,location};
}

const requests=[];
const h=harness(async (url,options)=>{
  requests.push({url,options});
  if(String(url).includes('/token?grant_type=password')){
    return {ok:true,status:200,json:async()=>({access_token:'access',refresh_token:'refresh',expires_in:3600})};
  }
  return {ok:true,status:200,json:async()=>({})};
});
await h.auth.sendMagicLink('Adult@Example.org');
assert.match(requests[0].url,/\/auth\/v1\/otp\?redirect_to=/);
assert.equal(JSON.parse(requests[0].options.body).email,'adult@example.org');
assert.ok(!Object.hasOwn(JSON.parse(requests[0].options.body),'redirect_to'));
await h.auth.signInWithPassword('Adult@Example.org','secret');
assert.equal(h.auth.readSession().access_token,'access');
h.auth.signInWithGoogle();
assert.match(h.location.redirect,/\/authorize\?provider=google&redirect_to=/);
await h.auth.signOut();
assert.equal(h.auth.readSession(),null);

const offline=harness(async()=>{throw new TypeError('Failed to fetch')});
let failure=null;
try{await offline.auth.sendMagicLink('adult@example.org')}catch(err){failure=err}
assert.equal(failure?.networkError,true);
assert.match(failure.message,/Supabase/);
offline.storage.setItem('aktywnik-plus-cloud-session-v1',JSON.stringify({access_token:'token',refresh_token:'refresh'}));
await offline.auth.signOut();
assert.equal(offline.auth.readSession(),null);
console.log('PASS: magic-link redirect, alternative login, network diagnostics and offline logout');
