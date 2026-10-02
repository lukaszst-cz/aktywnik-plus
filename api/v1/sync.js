'use strict';

const {noStore,requireCloud}=require('../_lib/backend');

const MAX_SYNC_ENTRIES=5000;
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
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
  const clientUpdatedAt=new Date(entry.updatedAt||entry.createdAt||fallbackUpdatedAt||Date.now());
  return {
    owner_id:ownerId,
    client_entry_id:entry.id,
    activity_date:entry.date,
    activity_type:activity,
    minutes,
    effort,
    note,
    source,
    client_updated_at:Number.isNaN(clientUpdatedAt.getTime())?new Date().toISOString():clientUpdatedAt.toISOString()
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

async function pushPersonal(auth,userId,body){
  const state=body?.state;
  if(!state||state.profileMode!=='self'){
    throw Object.assign(new Error('0.5 beta sync currently supports personal mode only.'),{status:400,code:'personal_mode_only'});
  }
  const entries=Array.isArray(state.entries)?state.entries:[];
  if(entries.length>MAX_SYNC_ENTRIES){
    throw Object.assign(new Error('Too many entries in one sync batch.'),{status:413,code:'sync_batch_too_large'});
  }
  const rows=entries.map(e=>toRow(e,userId,body?.updatedAt)).filter(Boolean);
  if(entries.length&&rows.length!==entries.length){
    throw Object.assign(new Error('One or more local entries are invalid for cloud sync.'),{status:400,code:'invalid_sync_entry'});
  }
  if(!rows.length)return {synced:0};

  const {url}=supabaseConfig();
  const response=await fetch(
    url+'/rest/v1/personal_activities?on_conflict=owner_id,client_entry_id',
    {
      method:'POST',
      headers:supaHeaders(auth,{'Prefer':'resolution=merge-duplicates,return=minimal'}),
      body:JSON.stringify(rows)
    }
  );
  const data=await readJson(response);
  if(!response.ok)throw Object.assign(new Error(data?.message||'Cloud write failed.'),{status:502,code:'cloud_write_failed'});
  return {synced:rows.length};
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
    const user=await authenticatedUser(auth);

    if(req.method==='GET'){
      const entries=await pullPersonal(auth,user.id);
      return res.status(200).json({
        ok:true,
        mode:'self',
        entries,
        deletesSupported:false
      });
    }

    const result=await pushPersonal(auth,user.id,req.body||{});
    return res.status(200).json({
      ok:true,
      mode:'self',
      synced:result.synced,
      deletesSupported:false
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
