'use strict';

const {noStore,requireCloud}=require('../_lib/backend');

const MAX_SYNC_ENTRIES=5000;
const SYNC_PROTOCOL_VERSION=1;
const MAX_FUTURE_SKEW_MS=15*60*1000;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bearer(req){
  const raw=req.headers?.authorization||req.headers?.Authorization||'';
  return /^Bearer\s+\S+$/i.test(raw)?raw:null;
}

function supabaseConfig(){
  return {
    url:String(process.env.SUPABASE_URL||'').replace(/\/$/,''),
    key:process.env.SUPABASE_PUBLISHABLE_KEY||''
  };
}

function supaHeaders(auth,extra={}){
  const {key}=supabaseConfig();
  return {
    apikey:key,
    Authorization:auth,
    'Content-Type':'application/json',
    ...extra
  };
}

async function readJson(response){
  const text=await response.text();
  if(!text)return null;
  try{return JSON.parse(text)}catch{return {message:text}}
}

async function authenticatedUser(auth){
  const {url,key}=supabaseConfig();
  if(!url||!key)throw Object.assign(new Error('Supabase public transport is not configured.'),{status:503,code:'sync_transport_not_configured'});
  const response=await fetch(url+'/auth/v1/user',{headers:supaHeaders(auth)});
  const data=await readJson(response);
  if(!response.ok||!data?.id)throw Object.assign(new Error(data?.message||'Invalid or expired session.'),{status:401,code:'invalid_session'});
  return data;
}

function validDate(value){
  const raw=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return false;
  const parsed=new Date(raw+'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===raw;
}

function safeClientTime(value,fallback=Date.now()){
  const parsed=new Date(value??fallback);
  const time=parsed.getTime();
  if(Number.isNaN(time)||time>Date.now()+MAX_FUTURE_SKEW_MS)return null;
  return parsed;
}

function requireSyncProtocol(value){
  const version=value==null||value===''?SYNC_PROTOCOL_VERSION:Number(value);
  if(!Number.isInteger(version)||version<1){
    throw Object.assign(new Error('Invalid sync protocol version.'),{status:400,code:'invalid_sync_protocol'});
  }
  if(version>SYNC_PROTOCOL_VERSION){
    throw Object.assign(new Error('This client uses a newer sync protocol. Update Aktywnik+ before synchronizing.'),{status:409,code:'sync_protocol_too_new'});
  }
  return version;
}

function toRow(entry,ownerId,fallbackUpdatedAt){
  if(!entry||typeof entry!=='object')return null;
  if(!UUID_RE.test(String(entry.id||'')))return null;
  if(!validDate(entry.date))return null;
  const activity=String(entry.activity||'').trim().slice(0,80);
  const minutes=Math.round(Number(entry.minutes));
  const effort=entry.effort==null?null:Math.round(Number(entry.effort));
  if(!activity||!Number.isFinite(minutes)||minutes<1||minutes>600)return null;
  if(effort!=null&&(!Number.isFinite(effort)||effort<1||effort>5))return null;
  const note=String(entry.note||'').trim().slice(0,120)||null;
  const source=entry.source==='timer'?'timer':'manual';
  const clientUpdatedAt=safeClientTime(entry.updatedAt||entry.createdAt||fallbackUpdatedAt);
  if(!clientUpdatedAt)return null;
  return {
    owner_id:ownerId,
    client_entry_id:entry.id,
    activity_date:entry.date,
    activity_type:activity,
    minutes,
    effort,
    note,
    source,
    client_updated_at:clientUpdatedAt.toISOString()
  };
}

async function pullPersonal(auth,userId){
  const {url}=supabaseConfig();
  const query=new URLSearchParams({
    select:'client_entry_id,activity_date,activity_type,minutes,effort,note,source,client_updated_at,updated_at',
    owner_id:'eq.'+userId,
    order:'client_updated_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const response=await fetch(url+'/rest/v1/personal_activities?'+query.toString(),{
    headers:supaHeaders(auth)
  });
  const data=await readJson(response);
  if(!response.ok)throw Object.assign(new Error(data?.message||'Cloud read failed.'),{status:502,code:'cloud_read_failed'});
  return Array.isArray(data)?data:[];
}
async function pullPersonalDeletes(auth,userId){
  const {url}=supabaseConfig();
  const query=new URLSearchParams({
    select:'client_entry_id,deleted_at',
    owner_id:'eq.'+userId,
    order:'deleted_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const response=await fetch(url+'/rest/v1/personal_activity_tombstones?'+query.toString(),{
    headers:supaHeaders(auth)
  });
  const data=await readJson(response);
  if(!response.ok)throw Object.assign(new Error(data?.message||'Cloud tombstone read failed.'),{status:502,code:'cloud_delete_read_failed'});
  return Array.isArray(data)?data:[];
}

async function pushPersonal(auth,userId,body){
  const state=body?.state;
  if(!state||state.profileMode!=='self'){
    throw Object.assign(new Error('0.5 beta sync currently supports personal mode only.'),{status:400,code:'personal_mode_only'});
  }
  const entries=Array.isArray(state.entries)?state.entries:[];
  const deletes=Array.isArray(body?.deletes)?body.deletes:[];
  if(entries.length>MAX_SYNC_ENTRIES||deletes.length>MAX_SYNC_ENTRIES){
    throw Object.assign(new Error('Too many entries in one sync batch.'),{status:413,code:'sync_batch_too_large'});
  }

  const {url}=supabaseConfig();

  const deleteRows=deletes.map(item=>{
    if(!item||!UUID_RE.test(String(item.id||'')))return null;
    const deletedAt=safeClientTime(item.deletedAt);
    if(!deletedAt)return null;
    return {owner_id:userId,client_entry_id:String(item.id),deleted_at:deletedAt.toISOString()};
  }).filter(Boolean);
  if(deletes.length&&deleteRows.length!==deletes.length){
    throw Object.assign(new Error('One or more delete tombstones are invalid.'),{status:400,code:'invalid_delete_tombstone'});
  }

  if(deleteRows.length){
    const ids=deleteRows.map(x=>x.client_entry_id);
    const existingTombQuery=new URLSearchParams({
      select:'client_entry_id,deleted_at',
      owner_id:'eq.'+userId,
      client_entry_id:'in.('+ids.join(',')+')'
    });
    const existingTombRes=await fetch(url+'/rest/v1/personal_activity_tombstones?'+existingTombQuery.toString(),{headers:supaHeaders(auth)});
    const existingTombData=await readJson(existingTombRes);
    if(!existingTombRes.ok)throw Object.assign(new Error(existingTombData?.message||'Cloud tombstone check failed.'),{status:502,code:'cloud_delete_check_failed'});
    const existingTombs=new Map((Array.isArray(existingTombData)?existingTombData:[]).map(x=>[String(x.client_entry_id),new Date(x.deleted_at).getTime()]));
    const newestDeletes=deleteRows.filter(row=>{
      const previous=existingTombs.get(row.client_entry_id);
      return !Number.isFinite(previous)||new Date(row.deleted_at).getTime()>previous;
    });

    if(newestDeletes.length){
      const tombstoneResponse=await fetch(
        url+'/rest/v1/personal_activity_tombstones?on_conflict=owner_id,client_entry_id',
        {
          method:'POST',
          headers:supaHeaders(auth,{'Prefer':'resolution=merge-duplicates,return=minimal'}),
          body:JSON.stringify(newestDeletes)
        }
      );
      const tombstoneData=await readJson(tombstoneResponse);
      if(!tombstoneResponse.ok)throw Object.assign(new Error(tombstoneData?.message||'Cloud tombstone write failed.'),{status:502,code:'cloud_delete_write_failed'});
    }

    const activityQuery=new URLSearchParams({
      select:'client_entry_id,client_updated_at',
      owner_id:'eq.'+userId,
      client_entry_id:'in.('+ids.join(',')+')'
    });
    const activityRes=await fetch(url+'/rest/v1/personal_activities?'+activityQuery.toString(),{headers:supaHeaders(auth)});
    const activityData=await readJson(activityRes);
    if(!activityRes.ok)throw Object.assign(new Error(activityData?.message||'Cloud activity delete check failed.'),{status:502,code:'cloud_delete_check_failed'});
    const activityTimes=new Map((Array.isArray(activityData)?activityData:[]).map(x=>[String(x.client_entry_id),new Date(x.client_updated_at).getTime()]));
    const deleteTimes=new Map(deleteRows.map(x=>[x.client_entry_id,new Date(x.deleted_at).getTime()]));
    const safeDeleteIds=ids.filter(id=>{
      const rowTime=activityTimes.get(id),deleteTime=deleteTimes.get(id);
      return !Number.isFinite(rowTime)||deleteTime>=rowTime;
    });
    if(safeDeleteIds.length){
      const deleteQuery=new URLSearchParams({owner_id:'eq.'+userId,client_entry_id:'in.('+safeDeleteIds.join(',')+')'});
      const deleteResponse=await fetch(url+'/rest/v1/personal_activities?'+deleteQuery.toString(),{
        method:'DELETE',
        headers:supaHeaders(auth,{'Prefer':'return=minimal'})
      });
      const deleteData=await readJson(deleteResponse);
      if(!deleteResponse.ok)throw Object.assign(new Error(deleteData?.message||'Cloud delete failed.'),{status:502,code:'cloud_delete_failed'});
    }
  }

  const rows=entries.map(e=>toRow(e,userId,body?.updatedAt)).filter(Boolean);
  if(entries.length&&rows.length!==entries.length){
    throw Object.assign(new Error('One or more local entries are invalid for cloud sync.'),{status:400,code:'invalid_sync_entry'});
  }

  let allowedRows=rows;
  if(rows.length){
    const ids=rows.map(x=>x.client_entry_id);
    const tombQuery=new URLSearchParams({
      select:'client_entry_id,deleted_at',
      owner_id:'eq.'+userId,
      client_entry_id:'in.('+ids.join(',')+')'
    });
    const tombRes=await fetch(url+'/rest/v1/personal_activity_tombstones?'+tombQuery.toString(),{headers:supaHeaders(auth)});
    const tombData=await readJson(tombRes);
    if(!tombRes.ok)throw Object.assign(new Error(tombData?.message||'Cloud tombstone check failed.'),{status:502,code:'cloud_delete_check_failed'});
    const tombstones=new Map((Array.isArray(tombData)?tombData:[]).map(x=>[String(x.client_entry_id),new Date(x.deleted_at).getTime()]));
    allowedRows=rows.filter(row=>{
      const deletedAt=tombstones.get(row.client_entry_id);
      if(!Number.isFinite(deletedAt))return true;
      return new Date(row.client_updated_at).getTime()>deletedAt;
    });
  }

  if(allowedRows.length){
    const response=await fetch(
      url+'/rest/v1/personal_activities?on_conflict=owner_id,client_entry_id',
      {
        method:'POST',
        headers:supaHeaders(auth,{'Prefer':'resolution=merge-duplicates,return=minimal'}),
        body:JSON.stringify(allowedRows)
      }
    );
    const data=await readJson(response);
    if(!response.ok)throw Object.assign(new Error(data?.message||'Cloud write failed.'),{status:502,code:'cloud_write_failed'});
  }
  return {synced:allowedRows.length,deleted:deleteRows.length,suppressed:rows.length-allowedRows.length};
}

module.exports = async function handler(req,res){
  noStore(res);
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res))return;

  const auth=bearer(req);
  if(!auth)return res.status(401).json({ok:false,error:'missing_bearer_token'});

  try{
    const protocolVersion=requireSyncProtocol(
      req.method==='GET'?req.query?.protocolVersion:req.body?.protocolVersion
    );
    const user=await authenticatedUser(auth);

    if(req.method==='GET'){
      const [entries,deletes]=await Promise.all([pullPersonal(auth,user.id),pullPersonalDeletes(auth,user.id)]);
      return res.status(200).json({
        ok:true,
        mode:'self',
        protocolVersion,
        entries,
        deletes,
        deletesSupported:true
      });
    }

    const result=await pushPersonal(auth,user.id,req.body||{});
    return res.status(200).json({
      ok:true,
      mode:'self',
      protocolVersion,
      synced:result.synced,
      deleted:result.deleted,
      suppressed:result.suppressed,
      deletesSupported:true
    });
  }catch(err){
    const status=Number(err?.status)||500;
    return res.status(status).json({
      ok:false,
      error:err?.code||'sync_failed',
      message:status>=500?'Synchronizacja chwilowo niedostępna. Dane lokalne są bezpieczne.':String(err?.message||'Synchronizacja nie powiodła się.')
    });
  }
};
