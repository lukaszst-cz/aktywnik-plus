'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req,res){
  noStore(res);
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res))return;
  const token=requireBearer(req,res);
  if(!token)return;

  const displayName=String(req.body?.displayName||'').trim();
  const operationId=String(req.body?.operationId||'');
  if(!displayName||displayName.length>60)return res.status(400).json({ok:false,error:'invalid_child_name'});
  if(operationId&&!UUID_RE.test(operationId))return res.status(400).json({ok:false,error:'invalid_operation_id'});

  try{
    const idempotent=Boolean(operationId);
    const response=await supabaseUserFetch(
      token,
      idempotent?'/rest/v1/rpc/create_guardian_child_idempotent':'/rest/v1/rpc/create_guardian_child',
      {
        method:'POST',
        body:JSON.stringify(idempotent
          ?{child_name:displayName,operation_key:operationId}
          :{child_name:displayName})
      }
    );
    const data=await jsonOrNull(response);

    if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
    if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
    if(!response.ok)return res.status(400).json({ok:false,error:'child_create_failed',detail:data?.message||null});

    return res.status(201).json({ok:true,childId:typeof data==='string'?data:null});
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
