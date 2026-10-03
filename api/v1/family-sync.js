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

const FAMILY_DECISIONS=new Set(['approved','rejected','corrected','deleted']);

function missingDecisionHistoryColumns(response,data){
  return (response?.status===400||response?.status===404)&&(
    data?.code==='PGRST204'||
    data?.code==='42703'||
    /client_event_id|client_entry_id/i.test(String(data?.message||''))
  );
}
function safeDecisionState(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const out={};
  if(value.date!=null)out.date=String(value.date).slice(0,10);
  if(value.activity!=null)out.activity=String(value.activity).trim().slice(0,80);
  if(value.minutes!=null&&Number.isFinite(Number(value.minutes)))out.minutes=Math.round(Number(value.minutes));
  if(value.effort!=null&&Number.isFinite(Number(value.effort)))out.effort=Math.round(Number(value.effort));
  if(value.note!=null)out.note=String(value.note).trim().slice(0,120);
  if(value.status!=null)out.status=String(value.status).slice(0,20);
  if(value.rejectionReason!=null)out.rejectionReason=String(value.rejectionReason).trim().slice(0,160);
  if(value.deleted===true)out.deleted=true;
  return Object.keys(out).length?out:null;
}
async function authenticatedUserId(token){
  const response=await supabaseUserFetch(token,'/auth/v1/user');
  const data=await jsonOrNull(response);
  if(!response.ok||!UUID_RE.test(String(data?.id||''))){
    throw Object.assign(new Error('Invalid or expired session.'),{status:401,code:'invalid_session'});
  }
  return String(data.id);
}
function normalizeDecision(event,childId,guardianId){
  if(!event||typeof event!=='object')return null;
  if(!UUID_RE.test(String(event.id||''))||!UUID_RE.test(String(event.entryId||'')))return null;
  const action=String(event.action||'');
  if(!FAMILY_DECISIONS.has(action)||event.actor!=='parent')return null;
  const decidedAt=safeClientTime(event.at);
  if(!decidedAt)return null;
  return {
    activity_id:null,
    child_id:childId,
    guardian_id:guardianId,
    actor_type:'guardian',
    decision:action,
    reason:String(event.note||'').trim().slice(0,240)||null,
    before_state:safeDecisionState(event.before),
    after_state:safeDecisionState(event.after),
    decided_at:decidedAt.toISOString(),
    client_event_id:String(event.id),
    client_entry_id:String(event.entryId)
  };
}

function missingTombstoneTable(response,data){
  return response?.status===404&&(data?.code==='PGRST205'||data?.code==='42P01');
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

async function pullFamilyDeletes(token,childId){
  const params=new URLSearchParams({
    select:'client_entry_id,deleted_at',
    child_id:'eq.'+childId,
    order:'deleted_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const response=await supabaseUserFetch(token,'/rest/v1/family_activity_tombstones?'+params.toString());
  const data=await jsonOrNull(response);
  if(missingTombstoneTable(response,data))return {rows:[],supported:false};
  if(!response.ok)throw Object.assign(new Error(data?.message||'Family tombstone read failed.'),{status:502,code:'family_delete_read_failed'});
  return {rows:Array.isArray(data)?data:[],supported:true};
}

async function pullFamilyDecisions(token,childId){
  const params=new URLSearchParams({
    select:'client_event_id,client_entry_id,decision,reason,before_state,after_state,decided_at',
    child_id:'eq.'+childId,
    client_event_id:'not.is.null',
    order:'decided_at.asc',
    limit:String(MAX_SYNC_ENTRIES)
  });
  const response=await supabaseUserFetch(token,'/rest/v1/activity_approval_events?'+params.toString());
  const data=await jsonOrNull(response);
  if(missingDecisionHistoryColumns(response,data))return {rows:[],supported:false};
  if(!response.ok)throw Object.assign(new Error(data?.message||'Family decision history read failed.'),{status:502,code:'family_decision_read_failed'});
  return {rows:Array.isArray(data)?data:[],supported:true};
}

async function pushFamily(token,childId,body){
  const entries=Array.isArray(body?.entries)?body.entries:[];
  const deletes=Array.isArray(body?.deletes)?body.deletes:[];
  const decisions=Array.isArray(body?.decisions)?body.decisions:[];
  if(entries.length>MAX_SYNC_ENTRIES||deletes.length>MAX_SYNC_ENTRIES||decisions.length>MAX_SYNC_ENTRIES){
    throw Object.assign(new Error('Too many family entries in one sync batch.'),{status:413,code:'family_sync_batch_too_large'});
  }

  if(duplicateIds(entries).size){
    throw Object.assign(new Error('Duplicate family activity ID in sync batch.'),{status:400,code:'duplicate_family_sync_entry'});
  }
  if(duplicateIds(deletes).size){
    throw Object.assign(new Error('Duplicate family delete tombstone ID in sync batch.'),{status:400,code:'duplicate_family_delete_tombstone'});
  }
  const entryIds=new Set(entries.map(item=>String(item?.id||'')).filter(id=>UUID_RE.test(id)));
  const overlap=deletes.map(item=>String(item?.id||'')).find(id=>entryIds.has(id));
  if(overlap){
    throw Object.assign(new Error('The same family activity cannot be updated and deleted in one sync batch.'),{status:400,code:'family_sync_entry_delete_conflict'});
  }

  if(duplicateIds(decisions).size){
    throw Object.assign(new Error('Duplicate family decision ID in sync batch.'),{status:400,code:'duplicate_family_decision'});
  }
  const guardianId=decisions.length?await authenticatedUserId(token):null;
  const decisionRows=decisions.map(event=>normalizeDecision(event,childId,guardianId)).filter(Boolean);
  if(decisionRows.length!==decisions.length){
    throw Object.assign(new Error('One or more family decisions are invalid for cloud sync.'),{status:400,code:'invalid_family_decision'});
  }
  let decisionsSynced=0;
  let decisionHistorySupported=true;

  const deleteRows=deletes.map(item=>{
    if(!item||!UUID_RE.test(String(item.id||'')))return null;
    const deletedAt=safeClientTime(item.deletedAt);
    if(!deletedAt)return null;
    return {
      child_id:childId,
      client_entry_id:String(item.id),
      deleted_at:deletedAt.toISOString()
    };
  }).filter(Boolean);
  if(deleteRows.length!==deletes.length){
    throw Object.assign(new Error('One or more family delete tombstones are invalid.'),{status:400,code:'invalid_family_delete_tombstone'});
  }

  let deletedCount=0;
  let deleteSuppressed=0;
  let deletesSupported=true;

  if(deleteRows.length){
    const ids=deleteRows.map(row=>row.client_entry_id);
    const tombLookup=new URLSearchParams({
      select:'client_entry_id,deleted_at',
      child_id:'eq.'+childId,
      client_entry_id:'in.('+ids.join(',')+')'
    });
    const currentTombResponse=await supabaseUserFetch(token,'/rest/v1/family_activity_tombstones?'+tombLookup.toString());
    const currentTombData=await jsonOrNull(currentTombResponse);
    if(missingTombstoneTable(currentTombResponse,currentTombData)){
      deletesSupported=false;
      deleteSuppressed=deleteRows.length;
    }else if(!currentTombResponse.ok){
      throw Object.assign(new Error(currentTombData?.message||'Family tombstone check failed.'),{status:502,code:'family_delete_check_failed'});
    }

    const currentTombs=new Map((deletesSupported&&Array.isArray(currentTombData)?currentTombData:[]).map(row=>[
      String(row.client_entry_id),
      new Date(row.deleted_at).getTime()
    ]));
    const newestDeletes=deletesSupported?deleteRows.filter(row=>{
      const previous=currentTombs.get(row.client_entry_id);
      return !Number.isFinite(previous)||new Date(row.deleted_at).getTime()>previous;
    }):[];

    if(newestDeletes.length){
      const tombstoneResponse=await supabaseUserFetch(
        token,
        '/rest/v1/family_activity_tombstones?on_conflict=child_id,client_entry_id',
        {
          method:'POST',
          headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify(newestDeletes)
        }
      );
      const tombstoneData=await jsonOrNull(tombstoneResponse);
      if(!tombstoneResponse.ok)throw Object.assign(new Error(tombstoneData?.message||'Family tombstone write failed.'),{status:502,code:'family_delete_write_failed'});
    }

    if(deletesSupported){
      const activityLookup=new URLSearchParams({
        select:'client_entry_id,client_updated_at',
        child_id:'eq.'+childId,
        tenant_id:'is.null',
        client_entry_id:'in.('+ids.join(',')+')'
      });
    const activityResponse=await supabaseUserFetch(token,'/rest/v1/activities?'+activityLookup.toString());
    const activityData=await jsonOrNull(activityResponse);
    if(!activityResponse.ok)throw Object.assign(new Error(activityData?.message||'Family activity delete check failed.'),{status:502,code:'family_delete_check_failed'});

    const activityTimes=new Map((Array.isArray(activityData)?activityData:[]).map(row=>[
      String(row.client_entry_id),
      new Date(row.client_updated_at).getTime()
    ]));
    const deleteTimes=new Map(deleteRows.map(row=>[
      row.client_entry_id,
      new Date(row.deleted_at).getTime()
    ]));
    const safeDeleteIds=ids.filter(id=>{
      const activityTime=activityTimes.get(id);
      const deleteTime=deleteTimes.get(id);
      return !Number.isFinite(activityTime)||deleteTime>=activityTime;
    });

    if(safeDeleteIds.length){
      const deleteQuery=new URLSearchParams({
        child_id:'eq.'+childId,
        tenant_id:'is.null',
        client_entry_id:'in.('+safeDeleteIds.join(',')+')'
      });
      const deleteResponse=await supabaseUserFetch(
        token,
        '/rest/v1/activities?'+deleteQuery.toString(),
        {
          method:'DELETE',
          headers:{Prefer:'return=minimal'}
        }
      );
      const deleteData=await jsonOrNull(deleteResponse);
      if(!deleteResponse.ok)throw Object.assign(new Error(deleteData?.message||'Family cloud delete failed.'),{status:502,code:'family_delete_failed'});
    }

      deletedCount=safeDeleteIds.length;
      deleteSuppressed=deleteRows.length-safeDeleteIds.length;
    }
  }

  const rows=entries.map(entry=>normalizeEntry(entry,childId,body?.updatedAt)).filter(Boolean);
  if(rows.length!==entries.length){
    throw Object.assign(new Error('One or more family entries are invalid for cloud sync.'),{status:400,code:'invalid_family_sync_entry'});
  }

  let allowedByTombstone=rows;
  if(rows.length){
    const ids=rows.map(row=>row.client_entry_id);
    const tombLookup=new URLSearchParams({
      select:'client_entry_id,deleted_at',
      child_id:'eq.'+childId,
      client_entry_id:'in.('+ids.join(',')+')'
    });
    const tombResponse=await supabaseUserFetch(token,'/rest/v1/family_activity_tombstones?'+tombLookup.toString());
    const tombData=await jsonOrNull(tombResponse);
    if(missingTombstoneTable(tombResponse,tombData)){
      deletesSupported=false;
    }else if(!tombResponse.ok){
      throw Object.assign(new Error(tombData?.message||'Family tombstone check failed.'),{status:502,code:'family_delete_check_failed'});
    }
    const tombstones=new Map((deletesSupported&&Array.isArray(tombData)?tombData:[]).map(row=>[
      String(row.client_entry_id),
      new Date(row.deleted_at).getTime()
    ]));
    allowedByTombstone=rows.filter(row=>{
      const deletedAt=tombstones.get(row.client_entry_id);
      return !Number.isFinite(deletedAt)||new Date(row.client_updated_at).getTime()>deletedAt;
    });
  }

  let allowed=allowedByTombstone;
  if(allowedByTombstone.length){
    const ids=allowedByTombstone.map(row=>row.client_entry_id);
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
    allowed=allowedByTombstone.filter(row=>{
      const current=currentTimes.get(row.client_entry_id);
      return !Number.isFinite(current)||new Date(row.client_updated_at).getTime()>current;
    });
  }

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

  if(decisionRows.length){
    const response=await supabaseUserFetch(
      token,
      '/rest/v1/activity_approval_events?on_conflict=child_id,client_event_id',
      {
        method:'POST',
        headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},
        body:JSON.stringify(decisionRows)
      }
    );
    const data=await jsonOrNull(response);
    if(missingDecisionHistoryColumns(response,data)){
      decisionHistorySupported=false;
    }else if(!response.ok){
      throw Object.assign(new Error(data?.message||'Family decision history write failed.'),{status:502,code:'family_decision_write_failed'});
    }else{
      decisionsSynced=decisionRows.length;
    }
  }

  return {
    synced:allowed.length,
    deleted:deletedCount,
    deleteSuppressed,
    suppressed:rows.length-allowed.length,
    deletesSupported,
    decisionsSynced,
    decisionHistorySupported
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
      const [entries,deleteResult,decisionResult]=await Promise.all([
        pullFamily(token,childId),
        pullFamilyDeletes(token,childId),
        pullFamilyDecisions(token,childId)
      ]);
      return res.status(200).json({
        ok:true,
        mode:'family',
        protocolVersion,
        childId,
        entries,
        deletes:deleteResult.rows,
        decisions:decisionResult.rows,
        deletesSupported:deleteResult.supported,
        decisionHistorySupported:decisionResult.supported
      });
    }

    const result=await pushFamily(token,childId,req.body||{});
    return res.status(200).json({
      ok:true,
      mode:'family',
      protocolVersion,
      childId,
      synced:result.synced,
      deleted:result.deleted,
      deleteSuppressed:result.deleteSuppressed,
      suppressed:result.suppressed,
      deletesSupported:result.deletesSupported,
      decisionsSynced:result.decisionsSynced,
      decisionHistorySupported:result.decisionHistorySupported
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
