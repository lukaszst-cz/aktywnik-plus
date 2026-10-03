'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');
const {postRpcWithIdempotentFallback}=require('../_lib/idempotency');

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req,res){
  noStore(res);
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res))return;
  const token=requireBearer(req,res);
  if(!token)return;

  try{
    if(req.method==='GET'){
      const response=await supabaseUserFetch(
        token,
        '/rest/v1/classes?select=id,name,tenant_id,school_year_id,archived_at&order=name.asc'
      );
      const data=await jsonOrNull(response);

      if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
      if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
      if(!response.ok)return res.status(502).json({ok:false,error:'upstream_error'});

      return res.status(200).json({ok:true,classes:Array.isArray(data)?data:[]});
    }

    const tenantId=String(req.body?.tenantId||'');
    const schoolYearId=String(req.body?.schoolYearId||'');
    const name=String(req.body?.name||'').trim();
    const operationId=String(req.body?.operationId||'');
    if(!UUID_RE.test(tenantId)||!UUID_RE.test(schoolYearId)||!name||name.length>80){
      return res.status(400).json({ok:false,error:'invalid_class_payload'});
    }
    if(operationId&&!UUID_RE.test(operationId)){
      return res.status(400).json({ok:false,error:'invalid_operation_id'});
    }

    const idempotent=Boolean(operationId);
    let response,data,idempotency='legacy';
    if(idempotent){
      ({response,data,idempotency}=await postRpcWithIdempotentFallback(token,{
        idempotentPath:'/rest/v1/rpc/create_school_class_idempotent',
        idempotentBody:{
          target_tenant:tenantId,
          target_school_year:schoolYearId,
          class_name:name,
          operation_key:operationId
        },
        legacyPath:'/rest/v1/rpc/create_school_class',
        legacyBody:{
          target_tenant:tenantId,
          target_school_year:schoolYearId,
          class_name:name
        }
      }));
    }else{
      response=await supabaseUserFetch(token,'/rest/v1/rpc/create_school_class',{
        method:'POST',
        body:JSON.stringify({
          target_tenant:tenantId,
          target_school_year:schoolYearId,
          class_name:name
        })
      });
      data=await jsonOrNull(response);
    }

    if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
    if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
    if(!response.ok)return res.status(400).json({ok:false,error:'class_create_failed',detail:data?.message||null});

    return res.status(201).json({ok:true,classId:typeof data==='string'?data:null,idempotency});
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
