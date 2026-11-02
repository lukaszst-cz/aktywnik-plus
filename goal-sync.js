'use strict';

// Optional goal synchronization. An account must be explicitly linked by the user.
// This module never transports activities, profile names or parental PINs.
(function(){
  const ACCOUNT_KEY='aktywnik-plus-goal-sync-account-v1';
  const PERIODS=['7','14','21','month'];
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let running=false,timer=null;
  const bridge=()=>window.AktywnikMotivationBridge;
  const status=(message,kind='')=>{
    const node=document.getElementById('motivationCloudStatus');
    if(node){node.textContent=message;node.dataset.state=kind;}
  };
  function profileKey(child,mode){
    if(mode==='self')return 'self';
    const id=String(child?.cloudChildId||'').toLowerCase();
    return UUID.test(id)?'family:'+id:null;
  }
  function goalsFromState(){
    const state=bridge()?.snapshot();
    if(!state||!Array.isArray(state.children))return [];
    const scopedChildren=state.profileMode==='self'?state.children.filter(child=>child.id===state.child?.id):state.children;
    return scopedChildren.flatMap(child=>{
      const key=profileKey(child,state.profileMode);
      if(!key)return [];
      return PERIODS.flatMap(period=>{
        const value=Number(child.motivationGoals?.[period]||0);
        const raw=child.motivationGoalUpdatedAt?.[period]||null;
        let stamp=Date.parse(raw||'');
        if(!Number.isFinite(stamp)){
          if(value===0)return [];
          // Older local copies may contain goals without per-period timestamps.
          stamp=Date.parse('2026-01-01T00:00:00Z');
        }
        if(!Number.isInteger(value)||value<0||value>6000||stamp>Date.now()+15*60*1000)return [];
        return [{profile_key:key,period,target_minutes:value,changed_at:new Date(stamp).toISOString()}];
      });
    });
  }
  function buildHeaders(session){
    const key=window.AKTYWNIK_AUTH_CONFIG?.publishableKey;
    if(!key)throw new Error('Brak konfiguracji konta Supabase.');
    return {'apikey':key,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'};
  }
  function baseUrl(){
    const url=window.AKTYWNIK_AUTH_CONFIG?.supabaseUrl;
    if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw new Error('Brak poprawnego adresu chmury.');
    return url.replace(/\/$/,'')+'/rest/v1/user_activity_goals';
  }
  async function parseResponse(response){
    const text=await response.text();
    let body=null;
    try{body=JSON.parse(text)}catch{}
    if(!response.ok){
      const error=new Error(
        response.status===404||body?.code==='PGRST205'
          ?'Synchronizacja celów wymaga wdrożenia migracji bazy danych.'
          :body?.message||('Błąd Supabase HTTP '+response.status)
      );
      error.status=response.status;
      throw error;
    }
    return body;
  }
  async function pull(session,ownerId){
    const query=new URLSearchParams({
      select:'profile_key,period,target_minutes,changed_at',
      owner_id:'eq.'+ownerId,
      order:'changed_at.asc',
      limit:'250'
    });
    const response=await fetch(baseUrl()+'?'+query.toString(),{
      method:'GET',cache:'no-store',headers:buildHeaders(session)
    });
    const rows=await parseResponse(response);
    return Array.isArray(rows)?rows:[];
  }
  async function push(session,ownerId,rows){
    if(!rows.length)return;
    if(rows.length>250)throw new Error('Za dużo celów do wysłania.');
    const response=await fetch(baseUrl()+'?on_conflict=owner_id,profile_key,period',{
      method:'POST',cache:'no-store',
      headers:{...buildHeaders(session),'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(rows.map(row=>({...row,owner_id:ownerId})))
    });
    await parseResponse(response);
  }
  function rowKey(row){return row.profile_key+'|'+row.period}
  async function transfer(session,ownerId){
    const local=goalsFromState();
    const cloud=await pull(session,ownerId);
    const remote=new Map(cloud.map(row=>[rowKey(row),row]));
    const patches=[],outgoing=[];
    for(const row of local){
      const other=remote.get(rowKey(row));
      const localTime=Date.parse(row.changed_at);
      const remoteTime=other?Date.parse(other.changed_at):NaN;
      if(other&&Number.isFinite(remoteTime)&&remoteTime>=localTime){
        patches.push(other);
      }else outgoing.push(row);
    }
    // Previously set goals on another device must also appear on this device.
    const localKeys=new Set(local.map(rowKey));
    for(const row of cloud)if(!localKeys.has(rowKey(row)))patches.push(row);
    bridge()?.mergeCloudGoals(patches);
    await push(session,ownerId,outgoing);
    // Re-read after upserts to respect newer concurrent changes.
    bridge()?.mergeCloudGoals(await pull(session,ownerId));
    status('Cele zsynchronizowane z Twoim kontem.','ok');
    return true;
  }
  async function userContext(){
    const auth=window.AktywnikAuth;
    const session=await auth?.validSession?.();
    if(!session)return null;
    const user=await auth.currentUser();
    if(!user?.id||!UUID.test(user.id))return null;
    return {session,user};
  }
  function boundAccount(){
    try{return localStorage.getItem(ACCOUNT_KEY)||null}catch{return null}
  }
  async function syncNow(){
    if(running||navigator.onLine===false)return false;
    const bound=boundAccount();
    if(!bound){status('Cele są lokalne. Włącz synchronizację, aby połączyć je z kontem.');return false;}
    running=true;
    try{
      const ctx=await userContext();
      if(!ctx){status('Cele są lokalne. Zaloguj się, aby je zsynchronizować.');return false;}
      if(bound!==ctx.user.id){
        status('Zalogowano inne konto. Synchronizacja celów wstrzymana, aby nie mieszać danych.','error');
        return false;
      }
      return await transfer(ctx.session,bound);
    }catch(err){
      status('Cele pozostają lokalnie. '+String(err?.message||err).slice(0,180),'error');
      return false;
    }finally{running=false;}
  }
  async function connect(){
    if(running)return;
    running=true;
    try{
      const ctx=await userContext();
      if(!ctx){status('Najpierw zaloguj się na stronie Konto / Sync.','error');return;}
      const state=bridge()?.snapshot();
      if(state?.profileMode==='family'&&!state.children?.some(c=>profileKey(c,'family'))){
        status('Najpierw powiąż dziecko z chmurą w strefie rodzica.','error');return;
      }
      if(!state?.children?.length){status('Najpierw skonfiguruj profil.','error');return;}
      const prior=boundAccount(),isNew=prior!==ctx.user.id;
      if(isNew&&!confirm('Połączyć lokalne cele aktywności z kontem '+(ctx.user.email||'Supabase')+'? Cele z tego konta będą mogły pojawić się na tym urządzeniu.'))return;
      const ok=await transfer(ctx.session,ctx.user.id);
      if(ok){localStorage.setItem(ACCOUNT_KEY,ctx.user.id);}
    }catch(err){
      status('Nie udało się połączyć celów: '+String(err?.message||err).slice(0,180),'error');
    }finally{running=false;}
  }
  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(()=>{syncNow().catch(()=>{});},2000);
  }
  function init(){
    document.getElementById('motivationConnectCloud')?.addEventListener('click',()=>connect());
    if(boundAccount())schedule();
    else status('Cele zapisują się lokalnie, również bez konta.');
  }
  window.addEventListener('online',schedule);
  window.addEventListener('aktywnik:authchange',schedule);
  window.addEventListener('storage',event=>{
    if(event.key===ACCOUNT_KEY||event.key==='aktywnik-plus-cloud-session-v1')schedule();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')schedule();
  });
  window.AktywnikGoalSync={connect,syncNow,schedule,profileKey,goalsFromState};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
