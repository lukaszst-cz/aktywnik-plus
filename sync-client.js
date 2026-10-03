'use strict';

(function(){
  const KEY='aktywnik-plus-sync-outbox-v1';
  const LAST_SYNC_KEY='aktywnik-plus-last-cloud-sync-v1';
  const DELETES_KEY='aktywnik-plus-personal-deletes-v1';
  const STATE_KEY='aktywnik-plus-data-v1';
  const SYNC_PROTOCOL_VERSION=1;
  let syncTimer=null;
  let cycleRunning=false;
  let pushing=false;
  let pulling=false;
  let cloudEnabled=null;

  function t(key,fallback){
    const i18n=window.AktywnikI18n;
    const lang=i18n?.getLanguage?.()||document.documentElement.lang||'pl';
    return i18n?.messages?.[lang]?.[key]||fallback;
  }
  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
  }
  function currentProfileMode(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')?.profileMode||null}catch{return null}
  }
  function write(value){
    if(value)localStorage.setItem(KEY,JSON.stringify(value));
    else localStorage.removeItem(KEY);
  }
  function readDeletes(){
    try{return JSON.parse(localStorage.getItem(DELETES_KEY)||'{}')}catch{return {}}
  }
  function writeDeletes(value){
    try{
      if(value&&Object.keys(value).length)localStorage.setItem(DELETES_KEY,JSON.stringify(value));
      else localStorage.removeItem(DELETES_KEY);
    }catch{}
  }
  function markDeleted(id,deletedAt=new Date().toISOString()){
    if(!id||currentProfileMode()!=='self')return;
    const current=readDeletes();
    current[id]=deletedAt;
    writeDeletes(current);
    schedule();
  }
  function lastSync(){
    try{return localStorage.getItem(LAST_SYNC_KEY)||null}catch{return null}
  }
  function recordSync(){
    try{localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString())}catch{}
  }
  function assertServerProtocol(data){
    const version=data?.protocolVersion==null?SYNC_PROTOCOL_VERSION:Number(data.protocolVersion);
    if(!Number.isInteger(version)||version<1)throw new Error('invalid_sync_protocol');
    if(version>SYNC_PROTOCOL_VERSION)throw new Error('sync_protocol_too_new');
    return version;
  }
  function minimalPersonalEntry(entry){
    if(!entry||typeof entry!=='object')return entry;
    return {
      id:entry.id,
      date:entry.date,
      activity:entry.activity,
      minutes:entry.minutes,
      effort:entry.effort,
      note:entry.note,
      source:entry.source,
      createdAt:entry.createdAt,
      updatedAt:entry.updatedAt
    };
  }
  function minimalPersonalSnapshot(state){
    if(!state||typeof state!=='object'||state.profileMode!=='self')return null;
    return {
      schemaVersion:state.schemaVersion??null,
      profileMode:'self',
      entries:Array.isArray(state.entries)?state.entries.map(minimalPersonalEntry):[]
    };
  }
  function scrubStoredOutbox(){
    const current=read();
    if(!current?.snapshot)return current;
    const snapshot=minimalPersonalSnapshot(current.snapshot);
    if(!snapshot){write(null);return null}
    const next={...current,snapshot};
    write(next);
    return next;
  }
  function markDirty(state){
    const snapshot=minimalPersonalSnapshot(state);
    if(!snapshot)return;
    const current=read()||{};
    write({
      dirty:true,
      updatedAt:new Date().toISOString(),
      attempts:Number(current.attempts||0),
      lastError:current.lastError||null,
      snapshot
    });
    schedule();
  }
  function statusText(){
    const q=read();
    if(currentProfileMode()==='family')return t('sync.familyLocal','rodzina · dane lokalne');
    const session=window.AktywnikAuth?.readSession?.();
    if(!session)return t('sync.localOptional','lokalnie · konto opcjonalne');
    if(cloudEnabled===false)return t('sync.disabled','konto · sync beta wyłączony');
    if(q?.dirty||Object.keys(readDeletes()).length)return q?.lastError?t('sync.waiting','konto · sync oczekuje'):t('sync.pending','konto · zmiany czekają na sync');
    if(lastSync())return t('sync.synced','konto · zsynchronizowano');
    return t('sync.ready','konto · gotowe do sync');
  }
  function renderStatus(){
    const el=document.querySelector('#cloudSyncBadge');
    if(el)el.textContent=statusText();
  }
  async function capabilities(){
    try{
      const r=await fetch('/api/capabilities',{cache:'no-store'});
      const data=r.ok?await r.json():null;
      cloudEnabled=!!data?.cloud?.enabled;
      renderStatus();
      return data;
    }catch{
      cloudEnabled=null;
      renderStatus();
      return null;
    }
  }
  async function context(){
    if(currentProfileMode()!=='self'){renderStatus();return null}
    const auth=window.AktywnikAuth;if(!auth)return null;
    const session=await auth.validSession();if(!session){cloudEnabled=null;renderStatus();return null}
    const caps=await capabilities();
    if(!caps?.cloud?.enabled)return null;
    return {session,caps};
  }
  async function flush(prepared){
    if(pushing)return false;
    const q=scrubStoredOutbox();if(!q?.dirty)return true;
    if(q.snapshot?.profileMode!=='self'){write(null);renderStatus();return true}
    const ctx=prepared||await context();if(!ctx)return false;

    pushing=true;
    try{
      const res=await fetch('/api/v1/sync',{
        method:'POST',
        cache:'no-store',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer '+ctx.session.access_token
        },
        body:JSON.stringify({
          protocolVersion:SYNC_PROTOCOL_VERSION,
          schemaVersion:q.snapshot?.schemaVersion||null,
          updatedAt:q.updatedAt,
          state:q.snapshot,
          deletes:Object.entries(readDeletes()).map(([id,deletedAt])=>({id,deletedAt}))
        })
      });
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(data?.message||data?.error||('HTTP '+res.status));
      assertServerProtocol(data);
      write(null);
      writeDeletes(null);
      recordSync();
      renderStatus();
      return true;
    }catch(err){
      write({...q,attempts:Number(q.attempts||0)+1,lastError:String(err?.message||err),lastAttemptAt:new Date().toISOString()});
      renderStatus();
      return false;
    }finally{pushing=false}
  }
  async function pull(prepared){
    if(pulling||currentProfileMode()!=='self')return false;
    const ctx=prepared||await context();if(!ctx)return false;
    const bridge=window.AktywnikCloudBridge;
    if(!bridge?.mergePersonalEntries)return false;

    pulling=true;
    try{
      const res=await fetch('/api/v1/sync?protocolVersion='+SYNC_PROTOCOL_VERSION,{
        method:'GET',
        cache:'no-store',
        headers:{'Authorization':'Bearer '+ctx.session.access_token}
      });
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(data?.message||data?.error||('HTTP '+res.status));
      assertServerProtocol(data);
      const result=bridge.mergePersonalCloudState
        ? bridge.mergePersonalCloudState(Array.isArray(data?.entries)?data.entries:[],Array.isArray(data?.deletes)?data.deletes:[])
        : bridge.mergePersonalEntries(Array.isArray(data?.entries)?data.entries:[]);
      recordSync();
      renderStatus();
      return result;
    }catch{
      renderStatus();
      return false;
    }finally{pulling=false}
  }
  async function syncNow(){
    if(cycleRunning||navigator.onLine===false||currentProfileMode()!=='self')return false;
    cycleRunning=true;
    try{
      const ctx=await context();if(!ctx)return false;
      if(read()?.dirty||Object.keys(readDeletes()).length){
        const pushed=await flush(ctx);
        if(!pushed&&(read()?.dirty||Object.keys(readDeletes()).length))return false;
      }
      return await pull(ctx);
    }finally{cycleRunning=false}
  }
  function schedule(){
    renderStatus();
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>syncNow().catch(()=>{}),1200);
  }

  window.addEventListener('online',schedule);
  window.addEventListener('aktywnik:languagechange',renderStatus);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
  window.addEventListener('storage',event=>{
    if(event.key==='aktywnik-plus-cloud-session-v1'||event.key===KEY)renderStatus();
  });
  document.addEventListener('DOMContentLoaded',()=>{scrubStoredOutbox();renderStatus();schedule()});

  window.AktywnikSync={protocolVersion:SYNC_PROTOCOL_VERSION,minimalPersonalSnapshot,scrubStoredOutbox,markDirty,markDeleted,flush,pull,syncNow,read,readDeletes,renderStatus};
})();
