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
  const params=new URLSearchParams({
    select:'client_entry_id,activity_date,activity_type,minutes,effort,note,status,source,rejection_reason,approved_at,client_updated_at,updated_at',
    child_id:'eq.'+childId,
    tenant_id:'is.null',
    client_entry_id:'not.is.null',
    order:'client_updated_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const response=await supabaseUserFetch(token,'/rest/v1/activities?'+params.toString());
  const data=await jsonOrNull(response);
  if(!response.ok)throw Object.assign(new Error(data?.message||'Family cloud read failed.'),{status:502,code:'family_cloud_read_failed'});
  return Array.isArray(data)?data:[];
}

async function pushFamily(token,childId,body){
  const entries=Array.isArray(body?.entries)?body.entries:[];
  if(entries.length>MAX_SYNC_ENTRIES){
    throw Object.assign(new Error('Too many family entries in one sync batch.'),{status:413,code:'family_sync_batch_too_large'});
  }
  if(duplicateIds(entries).size){
    throw Object.assign(new Error('Duplicate family activity ID in sync batch.'),{status:400,code:'duplicate_family_sync_entry'});
  }

  const rows=entries.map(entry=>normalizeEntry(entry,childId,body?.updatedAt)).filter(Boolean);
  if(rows.length!==entries.length){
    throw Object.assign(new Error('One or more family entries are invalid for cloud sync.'),{status:400,code:'invalid_family_sync_entry'});
  }
  if(!rows.length)return {synced:0,suppressed:0};

  const ids=rows.map(row=>row.client_entry_id);
  const lookup=new URLSearchParams({
    select:'client_entry_id,client_updated_at',
    child_id:'eq.'+childId,
    tenant_id:'is.null',
    client_entry_id:'in.('+ids.join(',')+')'
  });
  const currentResponse=await supabaseUserFetch(token,'/rest/v1/activities?'+lookup.toString());
  const currentData=await jsonOrNull(currentResponse);
  if(!currentResponse.ok)throw Object.assign(new Error(currentData?.message||'Family conflict check failed.'),{status:502,code:'family_conflict_check_failed'});

  const currentTimes=new Map((Array.isArray(currentData)?currentData:[]).map(row=>[
    String(row.client_entry_id),
    new Date(row.client_updated_at).getTime()
  ]));
  const allowed=rows.filter(row=>{
    const current=currentTimes.get(row.client_entry_id);
    return !Number.isFinite(current)||new Date(row.client_updated_at).getTime()>current;
  });

  if(allowed.length){
    const response=await supabaseUserFetch(
      token,
      '/rest/v1/activities?on_conflict=child_id,client_entry_id',
      {
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(allowed)
      }
    );
    const data=await jsonOrNull(response);
    if(!response.ok)throw Object.assign(new Error(data?.message||'Family cloud write failed.'),{status:502,code:'family_cloud_write_failed'});
  }

  return {synced:allowed.length,suppressed:rows.length-allowed.length};
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
      const entries=await pullFamily(token,childId);
      return res.status(200).json({
        ok:true,
        mode:'family',
        protocolVersion,
        childId,
        entries,
        deletesSupported:false
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
      deletesSupported:false
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
