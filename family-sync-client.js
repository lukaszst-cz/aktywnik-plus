'use strict';

(function(){
  const KEY='aktywnik-plus-family-sync-outbox-v1';
  const LAST_SYNC_KEY='aktywnik-plus-last-family-cloud-sync-v1';
  const DELETES_KEY='aktywnik-plus-family-deletes-v1';
  const STATE_KEY='aktywnik-plus-data-v1';
  const SYNC_PROTOCOL_VERSION=1;
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let syncTimer=null;
  let cycleRunning=false;
  let pushing=false;
  let pulling=false;
  let cloudEnabled=null;
  let familySyncEnabled=null;

  function t(key,fallback){
    const i18n=window.AktywnikI18n;
    const lang=i18n?.getLanguage?.()||document.documentElement.lang||'pl';
    return i18n?.messages?.[lang]?.[key]||fallback;
  }
  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
  }
  function write(value){
    try{
      if(value)localStorage.setItem(KEY,JSON.stringify(value));
      else localStorage.removeItem(KEY);
    }catch{}
  }
  function readState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}
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
  function isFamilyMode(){
    return readState()?.profileMode==='family';
  }
  function validUuid(value){return UUID_RE.test(String(value||''))}
  function lastSync(){
    try{return localStorage.getItem(LAST_SYNC_KEY)||null}catch{return null}
  }
  function recordSync(){
    try{localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString())}catch{}
  }
  function linkedChildren(state=readState()){
    return (Array.isArray(state?.children)?state.children:[])
      .filter(child=>String(child?.id||'').trim()&&validUuid(child?.cloudChildId))
      .map(child=>({
        localChildId:String(child.id),
        cloudChildId:String(child.cloudChildId).toLowerCase()
      }));
  }
  function scrubDeletes(){
    const links=linkedChildren();
    const allowed=new Set(links.map(link=>link.cloudChildId));
    const current=readDeletes(),next={};
    for(const [key,item] of Object.entries(current)){
      if(!item||!validUuid(item.cloudChildId)||!validUuid(item.id))continue;
      if(!allowed.has(String(item.cloudChildId).toLowerCase()))continue;
      const stamp=new Date(item.deletedAt||'').getTime();
      if(!Number.isFinite(stamp))continue;
      next[key]={
        localChildId:String(item.localChildId||''),
        cloudChildId:String(item.cloudChildId).toLowerCase(),
        id:String(item.id),
        deletedAt:new Date(stamp).toISOString()
      };
    }
    writeDeletes(next);
    return next;
  }
  function markDeleted(localChildId,entryId,deletedAt=new Date().toISOString()){
    const state=readState();
    const child=(Array.isArray(state.children)?state.children:[]).find(c=>String(c.id)===String(localChildId));
    if(!child||!validUuid(child.cloudChildId)||!validUuid(entryId))return false;
    const parsed=new Date(deletedAt||'');
    if(Number.isNaN(parsed.getTime()))return false;
    const cloudChildId=String(child.cloudChildId).toLowerCase();
    const current=readDeletes();
    current[cloudChildId+':'+entryId]={
      localChildId:String(localChildId),
      cloudChildId,
      id:String(entryId),
      deletedAt:parsed.toISOString()
    };
    writeDeletes(current);
    schedule();
    return true;
  }
  function dropChildQueue(cloudChildId){
    if(!validUuid(cloudChildId))return;
    const normalized=String(cloudChildId).toLowerCase(),current=readDeletes(),next={};
    for(const [key,item] of Object.entries(current)){
      if(String(item?.cloudChildId||'').toLowerCase()===normalized)continue;
      next[key]=item;
    }
    writeDeletes(next);
    const state=readState();
    const snapshot=minimalFamilySnapshot(state);
    if(snapshot){
      const queued=read()||{};
      write({...queued,dirty:true,updatedAt:new Date().toISOString(),snapshot});
    }else write(null);
    renderStatus();
  }
  function entryStamp(entry){
    return entry?.updatedAt||entry?.approvedAt||entry?.rejectedAt||entry?.stoppedAt||entry?.createdAt||null;
  }
  function minimalEntry(entry,cloudChildId){
    return {
      id:entry.id,
      childId:cloudChildId,
      date:entry.date,
      activity:entry.activity,
      minutes:entry.minutes,
      effort:entry.effort,
      note:entry.note,
      status:entry.status,
      source:entry.source,
      rejectionReason:entry.rejectionReason||'',
      createdAt:entry.createdAt,
      updatedAt:entryStamp(entry),
      approvedAt:entry.approvedAt||null,
      rejectedAt:entry.rejectedAt||null
    };
  }
  function minimalFamilySnapshot(state){
    if(!state||state.profileMode!=='family')return null;
    const links=linkedChildren(state);
    if(!links.length)return null;
    const byLocal=new Map(links.map(link=>[link.localChildId,link]));
    const groups=links.map(link=>({
      localChildId:link.localChildId,
      cloudChildId:link.cloudChildId,
      entries:[]
    }));
    const groupByCloud=new Map(groups.map(group=>[group.cloudChildId,group]));
    for(const entry of (Array.isArray(state.entries)?state.entries:[])){
      const link=byLocal.get(String(entry?.childId||''));
      if(!link)continue;
      groupByCloud.get(link.cloudChildId)?.entries.push(minimalEntry(entry,link.cloudChildId));
    }
    return {
      schemaVersion:state.schemaVersion??null,
      profileMode:'family',
      groups
    };
  }
  function scrubStoredOutbox(){
    scrubDeletes();
    const current=read();
    const snapshot=minimalFamilySnapshot(readState());
    if(!snapshot){write(null);return null}
    if(!current?.snapshot){
      if(!Object.keys(readDeletes()).length)return current;
      const next={dirty:true,updatedAt:new Date().toISOString(),attempts:0,lastError:null,snapshot};
      write(next);return next;
    }
    const next={
      dirty:current.dirty===true,
      updatedAt:typeof current.updatedAt==='string'?current.updatedAt:new Date().toISOString(),
      attempts:Number(current.attempts||0),
      lastError:current.lastError?String(current.lastError):null,
      ...(current.lastAttemptAt?{lastAttemptAt:String(current.lastAttemptAt)}:{}),
      snapshot
    };
    write(next);return next;
  }
  function markDirty(state){
    if(!state||state.profileMode!=='family')return;
    const snapshot=minimalFamilySnapshot(state);
    if(!snapshot){write(null);renderStatus();return}
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
    if(!isFamilyMode())return '';
    const links=linkedChildren();
    if(!links.length)return t('sync.familyLocal','rodzina · dane lokalne');
    const session=window.AktywnikAuth?.readSession?.();
    if(!session)return t('sync.familyLogin','rodzina · połączono profil, zaloguj konto');
    if(cloudEnabled===false||familySyncEnabled===false)return t('sync.familyDisabled','rodzina · sync beta wyłączony');
    const q=read(),deletes=readDeletes();
    if(q?.dirty||Object.keys(deletes).length)return q?.lastError?t('sync.familyWaiting','rodzina · sync oczekuje'):t('sync.familyPending','rodzina · zmiany czekają na sync');
    if(lastSync())return t('sync.familySynced','rodzina · zsynchronizowano');
    return t('sync.familyReady','rodzina · sync gotowy');
  }
  function renderStatus(){
    window.AktywnikSync?.renderStatus?.();
  }
  async function capabilities(){
    try{
      const res=await fetch('/api/capabilities',{cache:'no-store'});
      const data=res.ok?await res.json():null;
      cloudEnabled=!!data?.cloud?.enabled;
      familySyncEnabled=!!data?.cloud?.familySyncBeta;
      renderStatus();return data;
    }catch{
      cloudEnabled=null;familySyncEnabled=null;renderStatus();return null;
    }
  }
  async function context(){
    if(!isFamilyMode())return null;
    const auth=window.AktywnikAuth;if(!auth)return null;
    const session=await auth.validSession();if(!session){renderStatus();return null}
    const caps=await capabilities();
    if(!caps?.cloud?.enabled||!caps?.cloud?.familySyncBeta)return null;
    return {session,caps};
  }
  function assertProtocol(data){
    const version=data?.protocolVersion==null?SYNC_PROTOCOL_VERSION:Number(data.protocolVersion);
    if(!Number.isInteger(version)||version<1)throw new Error('invalid_sync_protocol');
    if(version>SYNC_PROTOCOL_VERSION)throw new Error('sync_protocol_too_new');
  }
  async function flush(prepared){
    if(pushing||!isFamilyMode())return false;
    const q=scrubStoredOutbox();
    const deletes=readDeletes();
    if(!q?.dirty&&!Object.keys(deletes).length)return true;
    const ctx=prepared||await context();if(!ctx)return false;

    pushing=true;
    try{
      for(const group of q.snapshot.groups||[]){
        if(!validUuid(group.cloudChildId))continue;
        const res=await fetch('/api/v1/family-sync',{
          method:'POST',
          cache:'no-store',
          headers:{
            'Content-Type':'application/json',
            'Authorization':'Bearer '+ctx.session.access_token
          },
          body:JSON.stringify({
            protocolVersion:SYNC_PROTOCOL_VERSION,
            childId:group.cloudChildId,
            updatedAt:q.updatedAt,
            entries:Array.isArray(group.entries)?group.entries:[],
            deletes:Object.values(deletes)
              .filter(item=>String(item?.cloudChildId||'').toLowerCase()===String(group.cloudChildId).toLowerCase())
              .map(item=>({id:item.id,deletedAt:item.deletedAt}))
          })
        });
        const data=await res.json().catch(()=>null);
        if(!res.ok)throw new Error(data?.message||data?.error||('HTTP '+res.status));
        assertProtocol(data);
      }
      write(null);writeDeletes(null);recordSync();renderStatus();return true;
    }catch(err){
      write({...q,attempts:Number(q.attempts||0)+1,lastError:String(err?.message||err),lastAttemptAt:new Date().toISOString()});
      renderStatus();return false;
    }finally{pushing=false}
  }
  async function pull(prepared){
    if(pulling||!isFamilyMode())return false;
    const ctx=prepared||await context();if(!ctx)return false;
    const bridge=window.AktywnikCloudBridge;
    if(!bridge?.mergeFamilyCloudState)return false;

    const state=readState(),links=linkedChildren(state);
    if(!links.length)return false;
    pulling=true;
    try{
      const totals={added:0,updated:0,localNewer:0,ignored:0,deleted:0};
      for(const link of links){
        const url='/api/v1/family-sync?protocolVersion='+SYNC_PROTOCOL_VERSION+'&childId='+encodeURIComponent(link.cloudChildId);
        const res=await fetch(url,{
          method:'GET',cache:'no-store',
          headers:{'Authorization':'Bearer '+ctx.session.access_token}
        });
        const data=await res.json().catch(()=>null);
        if(!res.ok)throw new Error(data?.message||data?.error||('HTTP '+res.status));
        assertProtocol(data);
        const result=bridge.mergeFamilyCloudState(
          link.localChildId,
          Array.isArray(data?.entries)?data.entries:[],
          Array.isArray(data?.deletes)?data.deletes:[]
        );
        for(const key of Object.keys(totals))totals[key]+=Number(result?.[key]||0);
      }
      recordSync();renderStatus();return totals;
    }catch{
      renderStatus();return false;
    }finally{pulling=false}
  }
  async function syncNow(){
    if(cycleRunning||navigator.onLine===false||!isFamilyMode())return false;
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
    syncTimer=setTimeout(()=>syncNow().catch(()=>{}),1400);
  }
  function clear(){
    write(null);writeDeletes(null);
    try{localStorage.removeItem(LAST_SYNC_KEY)}catch{}
    renderStatus();
  }

  window.addEventListener('online',schedule);
  window.addEventListener('aktywnik:languagechange',renderStatus);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
  window.addEventListener('storage',event=>{
    if(event.key==='aktywnik-plus-cloud-session-v1'||event.key===KEY||event.key===DELETES_KEY||event.key===STATE_KEY)renderStatus();
  });
  document.addEventListener('DOMContentLoaded',()=>{scrubStoredOutbox();renderStatus();schedule()});

  window.AktywnikFamilySync={
    protocolVersion:SYNC_PROTOCOL_VERSION,
    minimalFamilySnapshot,
    markDirty,
    flush,
    pull,
    syncNow,
    read,
    readDeletes,
    markDeleted,
    dropChildQueue,
    linkedChildren,
    statusText,
    renderStatus,
    clear
  };
})();
