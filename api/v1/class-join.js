'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');

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
      const classId=String(req.query?.classId||'');
      if(!UUID_RE.test(classId))return res.status(400).json({ok:false,error:'invalid_class_id'});
      const query=new URLSearchParams({
        select:'id,class_id,child_id,requested_by,status,created_at,decided_at,decided_by',
        class_id:'eq.'+classId,
        order:'created_at.desc'
      });
      const response=await supabaseUserFetch(token,'/rest/v1/class_join_requests?'+query.toString());
      const data=await jsonOrNull(response);
      if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
      if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
      if(!response.ok)return res.status(502).json({ok:false,error:'upstream_error'});
      return res.status(200).json({ok:true,requests:Array.isArray(data)?data:[]});
    }

    const action=String(req.body?.action||'');
    if(action==='request'){
      const inviteToken=String(req.body?.inviteToken||'');
      const childId=String(req.body?.childId||'');
      if(!UUID_RE.test(inviteToken)||!UUID_RE.test(childId)){
        return res.status(400).json({ok:false,error:'invalid_join_payload'});
      }
      const response=await supabaseUserFetch(token,'/rest/v1/rpc/request_class_join',{
        method:'POST',
        body:JSON.stringify({invite_token:inviteToken,target_child:childId})
      });
      const data=await jsonOrNull(response);
      if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
      if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
      if(!response.ok)return res.status(400).json({ok:false,error:'join_request_failed',detail:data?.message||null});
      return res.status(201).json({ok:true,requestId:typeof data==='string'?data:null});
    }

    if(action==='decide'){
      const requestId=String(req.body?.requestId||'');
      const decision=String(req.body?.decision||'');
      if(!UUID_RE.test(requestId)||!['accepted','rejected'].includes(decision)){
        return res.status(400).json({ok:false,error:'invalid_decision_payload'});
      }
      const response=await supabaseUserFetch(token,'/rest/v1/rpc/decide_class_join',{
        method:'POST',
        body:JSON.stringify({target_request:requestId,decision})
      });
      const data=await jsonOrNull(response);
      if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
      if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
      if(!response.ok)return res.status(400).json({ok:false,error:'join_decision_failed',detail:data?.message||null});
      return res.status(200).json({ok:true,accepted:decision==='accepted',result:data===true});
    }

    return res.status(400).json({ok:false,error:'unknown_action'});
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
