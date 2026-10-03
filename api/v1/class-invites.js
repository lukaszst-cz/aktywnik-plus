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

  const classId=String(req.body?.classId||'');
  const operationId=String(req.body?.operationId||'');
  const rawValidDays=req.body?.validDays;
  const validDays=rawValidDays==null||rawValidDays===''?14:Number(rawValidDays);
  if(!UUID_RE.test(classId))return res.status(400).json({ok:false,error:'invalid_class_id'});
  if(operationId&&!UUID_RE.test(operationId))return res.status(400).json({ok:false,error:'invalid_operation_id'});
  if(!Number.isInteger(validDays)||validDays<1||validDays>30){
    return res.status(400).json({ok:false,error:'invalid_invite_validity'});
  }

  try{
    const idempotent=Boolean(operationId);
    const response=await supabaseUserFetch(
      token,
      idempotent?'/rest/v1/rpc/create_class_invite_idempotent':'/rest/v1/rpc/create_class_invite',
      {
        method:'POST',
        body:JSON.stringify(idempotent
          ?{target_class:classId,operation_key:operationId,valid_days:validDays}
          :{target_class:classId,valid_days:validDays})
      }
    );
    const data=await jsonOrNull(response);
    if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
    if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
    if(!response.ok)return res.status(400).json({ok:false,error:'invite_create_failed',detail:data?.message||null});
    return res.status(201).json({ok:true,token:typeof data==='string'?data:null,validDays});
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
