'use strict';

(function(){
  const KEY='aktywnik-plus-sync-outbox-v1';
  const LAST_SYNC_KEY='aktywnik-plus-last-cloud-sync-v1';
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
  function write(value){
    if(value)localStorage.setItem(KEY,JSON.stringify(value));
    else localStorage.removeItem(KEY);
  }
  function lastSync(){
    try{return localStorage.getItem(LAST_SYNC_KEY)||null}catch{return null}
  }
  function recordSync(){
    try{localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString())}catch{}
  }
  function markDirty(state){
    if(!state||typeof state!=='object')return;
    const current=read()||{};
    write({
      dirty:true,
      updatedAt:new Date().toISOString(),
      attempts:Number(current.attempts||0),
      lastError:current.lastError||null,
      snapshot:state
    });
    schedule();
  }
  function statusText(){
    const q=read();
    const session=window.AktywnikAuth?.readSession?.();
    if(!session)return t('sync.localOptional','lokalnie · konto opcjonalne');
    if(cloudEnabled===false)return t('sync.disabled','konto · sync beta wyłączony');
    if(q?.dirty)return q.lastError?t('sync.waiting','konto · sync oczekuje'):t('sync.pending','konto · zmiany czekają na sync');
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
    const auth=window.AktywnikAuth;if(!auth)return null;
    const session=await auth.validSession();if(!session){cloudEnabled=null;renderStatus();return null}
    const caps=await capabilities();
    if(!caps?.cloud?.enabled)return null;
    return {session,caps};
  }
  async function flush(prepared){
    if(pushing)return false;
    const q=read();if(!q?.dirty)return true;
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
          schemaVersion:q.snapshot?.schemaVersion||null,
          updatedAt:q.updatedAt,
          state:q.snapshot
        })
      });
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(data?.message||data?.error||('HTTP '+res.status));
      write(null);
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
    if(pulling)return false;
    const ctx=prepared||await context();if(!ctx)return false;
    const bridge=window.AktywnikCloudBridge;
    if(!bridge?.mergePersonalEntries)return false;

    pulling=true;
    try{
      const res=await fetch('/api/v1/sync',{
        method:'GET',
        cache:'no-store',
        headers:{'Authorization':'Bearer '+ctx.session.access_token}
      });
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(data?.message||data?.error||('HTTP '+res.status));
      const result=bridge.mergePersonalEntries(Array.isArray(data?.entries)?data.entries:[]);
      recordSync();
      renderStatus();
      return result;
    }catch{
      renderStatus();
      return false;
    }finally{pulling=false}
  }
  async function syncNow(){
    if(cycleRunning||navigator.onLine===false)return false;
    cycleRunning=true;
    try{
      const ctx=await context();if(!ctx)return false;
      if(read()?.dirty){
        const pushed=await flush(ctx);
        if(!pushed&&read()?.dirty)return false;
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
  document.addEventListener('DOMContentLoaded',()=>{renderStatus();schedule()});

  window.AktywnikSync={markDirty,flush,pull,syncNow,read,renderStatus};
})();
