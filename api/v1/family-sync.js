'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');

const MAX_SYNC_ENTRIES=5000;
const SYNC_PROTOCOL_VERSION=1;
const MAX_FUTURE_SKEW_MS=15*60*1000;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validDate(value){
  const raw=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return false;
  const parsed=new Date(raw+'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===raw;
}

function safeClientTime(value){
  const parsed=new Date(value||'');
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

function duplicateIds(items){
  const seen=new Set(),dupes=new Set();
  for(const item of Array.isArray(items)?items:[]){
    const id=String(item?.id||'');
    if(!UUID_RE.test(id))continue;
    if(seen.has(id))dupes.add(id); else seen.add(id);
  }
  return dupes;
}

function normalizeDelete(item){
  if(!item||typeof item!=='object'||!UUID_RE.test(String(item.id||'')))return null;
  const stamp=safeClientTime(item.deletedAt);
  if(!stamp)return null;
  return {id:String(item.id),deletedAt:stamp.toISOString()};
}

function normalizeEntry(entry,childId,fallbackUpdatedAt){
  if(!entry||typeof entry!=='object'||!UUID_RE.test(String(entry.id||'')))return null;
  if(!validDate(entry.date))return null;

  const activity=String(entry.activity||'').trim().slice(0,80);
  const minutes=Math.round(Number(entry.minutes));
  const effort=entry.effort==null?null:Math.round(Number(entry.effort));
  const status=['pending','approved','rejected'].includes(entry.status)?entry.status:null;
  const source=entry.source==='timer'?'timer':'manual';
  const note=String(entry.note||'').trim().slice(0,120)||null;
  const rejectionReason=String(entry.rejectionReason||'').trim().slice(0,160)||null;
  const stamp=safeClientTime(entry.updatedAt||entry.approvedAt||entry.rejectedAt||entry.createdAt||fallbackUpdatedAt);

  if(!activity||!Number.isFinite(minutes)||minutes<1||minutes>600||!status||!stamp)return null;
  if(effort!=null&&(!Number.isFinite(effort)||effort<1||effort>5))return null;
  if(status!=='rejected'&&rejectionReason)return null;

  return {
    child_id:childId,
    tenant_id:null,
    client_entry_id:String(entry.id),
    activity_date:entry.date,
    activity_type:activity,
    minutes,
    effort,
    note,
    status,
    source,
    rejection_reason:status==='rejected'?rejectionReason:null,
    approved_at:status==='approved'?(safeClientTime(entry.approvedAt||stamp.toISOString())||stamp).toISOString():null,
    updated_at:stamp.toISOString(),
    client_updated_at:stamp.toISOString()
  };
}

async function requireGuardian(token,childId){
  const path='/rest/v1/guardians?select=child_id&child_id=eq.'+encodeURIComponent(childId)+'&limit=1';
  const response=await supabaseUserFetch(token,path);
  const data=await jsonOrNull(response);
  if(response.status===401)throw Object.assign(new Error('Invalid or expired session.'),{status:401,code:'invalid_session'});
  if(!response.ok)throw Object.assign(new Error('Unable to verify family access.'),{status:502,code:'family_access_check_failed'});
  if(!Array.isArray(data)||!data.length)throw Object.assign(new Error('This child is not linked to the signed-in guardian.'),{status:403,code:'family_child_forbidden'});
}

async function pullFamily(token,childId){
  const activityParams=new URLSearchParams({
    select:'client_entry_id,activity_date,activity_type,minutes,effort,note,status,source,rejection_reason,approved_at,client_updated_at,updated_at',
    child_id:'eq.'+childId,
    tenant_id:'is.null',
    client_entry_id:'not.is.null',
    order:'client_updated_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const deleteParams=new URLSearchParams({
    select:'client_entry_id,deleted_at',
    child_id:'eq.'+childId,
    order:'deleted_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const [activityResponse,deleteResponse]=await Promise.all([
    supabaseUserFetch(token,'/rest/v1/activities?'+activityParams.toString()),
    supabaseUserFetch(token,'/rest/v1/family_activity_tombstones?'+deleteParams.toString())
  ]);
  const [activities,deletes]=await Promise.all([jsonOrNull(activityResponse),jsonOrNull(deleteResponse)]);
  if(!activityResponse.ok||!deleteResponse.ok){
    throw Object.assign(new Error(activities?.message||deletes?.message||'Family cloud read failed.'),{status:502,code:'family_cloud_read_failed'});
  }
  return {
    entries:Array.isArray(activities)?activities:[],
    deletes:Array.isArray(deletes)?deletes:[]
  };
}

async function pushFamily(token,childId,body){
  const entries=Array.isArray(body?.entries)?body.entries:[];
  const deletes=Array.isArray(body?.deletes)?body.deletes:[];
  if(entries.length>MAX_SYNC_ENTRIES||deletes.length>MAX_SYNC_ENTRIES){
    throw Object.assign(new Error('Too many family changes in one sync batch.'),{status:413,code:'family_sync_batch_too_large'});
  }
  if(duplicateIds(entries).size){
    throw Object.assign(new Error('Duplicate family activity ID in sync batch.'),{status:400,code:'duplicate_family_sync_entry'});
  }
  if(duplicateIds(deletes).size){
    throw Object.assign(new Error('Duplicate family delete ID in sync batch.'),{status:400,code:'duplicate_family_delete'});
  }

  const rows=entries.map(entry=>normalizeEntry(entry,childId,body?.updatedAt)).filter(Boolean);
  const tombstones=deletes.map(normalizeDelete).filter(Boolean);
  if(rows.length!==entries.length){
    throw Object.assign(new Error('One or more family entries are invalid for cloud sync.'),{status:400,code:'invalid_family_sync_entry'});
  }
  if(tombstones.length!==deletes.length){
    throw Object.assign(new Error('One or more family deletes are invalid for cloud sync.'),{status:400,code:'invalid_family_delete'});
  }

  const entryIds=new Set(rows.map(row=>row.client_entry_id));
  if(tombstones.some(item=>entryIds.has(item.id))){
    throw Object.assign(new Error('The same family activity cannot be updated and deleted in one batch.'),{status:400,code:'family_entry_delete_conflict'});
  }

  const allIds=[...new Set([...rows.map(row=>row.client_entry_id),...tombstones.map(item=>item.id)])];
  let currentActivities=[],currentDeletes=[];
  if(allIds.length){
    const activityLookup=new URLSearchParams({
      select:'client_entry_id,client_updated_at',
      child_id:'eq.'+childId,
      tenant_id:'is.null',
      client_entry_id:'in.('+allIds.join(',')+')'
    });
    const deleteLookup=new URLSearchParams({
      select:'client_entry_id,deleted_at',
      child_id:'eq.'+childId,
      client_entry_id:'in.('+allIds.join(',')+')'
    });
    const [activityResponse,deleteResponse]=await Promise.all([
      supabaseUserFetch(token,'/rest/v1/activities?'+activityLookup.toString()),
      supabaseUserFetch(token,'/rest/v1/family_activity_tombstones?'+deleteLookup.toString())
    ]);
    [currentActivities,currentDeletes]=await Promise.all([jsonOrNull(activityResponse),jsonOrNull(deleteResponse)]);
    if(!activityResponse.ok||!deleteResponse.ok){
      throw Object.assign(new Error(currentActivities?.message||currentDeletes?.message||'Family conflict check failed.'),{status:502,code:'family_conflict_check_failed'});
    }
  }

  const activityTimes=new Map((Array.isArray(currentActivities)?currentActivities:[]).map(row=>[
    String(row.client_entry_id),new Date(row.client_updated_at).getTime()
  ]));
  const deleteTimes=new Map((Array.isArray(currentDeletes)?currentDeletes:[]).map(row=>[
    String(row.client_entry_id),new Date(row.deleted_at).getTime()
  ]));

  const allowedEntries=rows.filter(row=>{
    const incoming=new Date(row.client_updated_at).getTime();
    const current=activityTimes.get(row.client_entry_id);
    const deleted=deleteTimes.get(row.client_entry_id);
    return (!Number.isFinite(current)||incoming>current)&&(!Number.isFinite(deleted)||incoming>deleted);
  });

  if(allowedEntries.length){
    const response=await supabaseUserFetch(
      token,
      '/rest/v1/activities?on_conflict=child_id,client_entry_id',
      {
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(allowedEntries)
      }
    );
    const data=await jsonOrNull(response);
    if(!response.ok)throw Object.assign(new Error(data?.message||'Family cloud write failed.'),{status:502,code:'family_cloud_write_failed'});
  }

  const allowedDeletes=tombstones.filter(item=>{
    const incoming=new Date(item.deletedAt).getTime();
    const current=deleteTimes.get(item.id);
    return !Number.isFinite(current)||incoming>current;
  });
  if(allowedDeletes.length){
    const response=await supabaseUserFetch(
      token,
      '/rest/v1/family_activity_tombstones?on_conflict=child_id,client_entry_id',
      {
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(allowedDeletes.map(item=>({
          child_id:childId,
          client_entry_id:item.id,
          deleted_at:item.deletedAt
        })))
      }
    );
    const data=await jsonOrNull(response);
    if(!response.ok)throw Object.assign(new Error(data?.message||'Family delete tombstone write failed.'),{status:502,code:'family_delete_write_failed'});
  }

  const deletableIds=allowedDeletes
    .filter(item=>{
      const activityTime=activityTimes.get(item.id);
      return Number.isFinite(activityTime)&&new Date(item.deletedAt).getTime()>=activityTime;
    })
    .map(item=>item.id);
  if(deletableIds.length){
    const params=new URLSearchParams({
      child_id:'eq.'+childId,
      tenant_id:'is.null',
      client_entry_id:'in.('+deletableIds.join(',')+')'
    });
    const response=await supabaseUserFetch(token,'/rest/v1/activities?'+params.toString(),{
      method:'DELETE',
      headers:{Prefer:'return=minimal'}
    });
    const data=await jsonOrNull(response);
    if(!response.ok)throw Object.assign(new Error(data?.message||'Family activity delete failed.'),{status:502,code:'family_activity_delete_failed'});
  }

  return {
    synced:allowedEntries.length,
    suppressed:rows.length-allowedEntries.length,
    deleted:deletableIds.length,
    deleteTombstones:allowedDeletes.length
  };
}

module.exports=async function handler(req,res){
  noStore(res);
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }
  if(!requireCloud(res))return;

  const token=requireBearer(req,res);
  if(!token)return;

  try{
    const protocolVersion=requireSyncProtocol(
      req.method==='GET'?req.query?.protocolVersion:req.body?.protocolVersion
    );
    const childId=String(req.method==='GET'?req.query?.childId:req.body?.childId||'').toLowerCase();
    if(!UUID_RE.test(childId)){
      return res.status(400).json({ok:false,error:'invalid_family_child_id'});
    }

    await requireGuardian(token,childId);

    if(req.method==='GET'){
      const pulled=await pullFamily(token,childId);
      return res.status(200).json({
        ok:true,
        mode:'family',
        protocolVersion,
        childId,
        entries:pulled.entries,
        deletes:pulled.deletes,
        deletesSupported:true
      });
    }

    const result=await pushFamily(token,childId,req.body||{});
    return res.status(200).json({
      ok:true,
      mode:'family',
      protocolVersion,
      childId,
      synced:result.synced,
      suppressed:result.suppressed,
      deleted:result.deleted,
      deleteTombstones:result.deleteTombstones,
      deletesSupported:true
    });
  }catch(err){
    const status=Number(err?.status)||500;
    return res.status(status).json({
      ok:false,
      error:err?.code||'family_sync_failed',
      message:status>=500?'Synchronizacja rodzinna chwilowo niedostępna. Dane lokalne są bezpieczne.':String(err?.message||'Synchronizacja rodzinna nie powiodła się.')
    });
  }
};
