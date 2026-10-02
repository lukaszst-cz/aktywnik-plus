'use strict';

(function(){
  const KEY='aktywnik-plus-sync-outbox-v1';
  let syncTimer=null;
  let syncing=false;

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
  }
  function write(value){
    if(value)localStorage.setItem(KEY,JSON.stringify(value));
    else localStorage.removeItem(KEY);
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
    if(!q?.dirty)return 'lokalnie · brak zmian do sync';
    return q.lastError?'lokalnie · sync oczekuje':'lokalnie · zmiany czekają na sync';
  }
  function renderStatus(){
    const el=document.querySelector('#cloudSyncBadge');
    if(el)el.textContent=statusText();
  }
  async function capabilities(){
    try{
      const r=await fetch('/api/capabilities',{cache:'no-store'});
      return r.ok?await r.json():null;
    }catch{return null}
  }
  async function flush(){
    if(syncing)return false;
    const q=read();if(!q?.dirty)return true;
    const auth=window.AktywnikAuth;
    if(!auth)return false;
    const session=await auth.validSession();
    if(!session)return false;
    const caps=await capabilities();
    if(!caps?.cloud?.enabled)return false;

    syncing=true;
    try{
      const res=await fetch('/api/v1/sync',{
        method:'POST',
        cache:'no-store',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer '+session.access_token
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
      renderStatus();
      return true;
    }catch(err){
      write({...q,attempts:Number(q.attempts||0)+1,lastError:String(err?.message||err),lastAttemptAt:new Date().toISOString()});
      renderStatus();
      return false;
    }finally{syncing=false}
  }
  function schedule(){
    renderStatus();
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>flush().catch(()=>{}),1500);
  }
  window.addEventListener('online',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
  document.addEventListener('DOMContentLoaded',()=>{renderStatus();schedule()});

  window.AktywnikSync={markDirty,flush,read,renderStatus};
})();
