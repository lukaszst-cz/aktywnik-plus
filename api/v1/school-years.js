'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req,res){
  noStore(res);
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }
  if(!requireCloud(res))return;
  const token=requireBearer(req,res);if(!token)return;

  const tenantId=String(req.query?.tenantId||'');
  if(!UUID_RE.test(tenantId))return res.status(400).json({ok:false,error:'invalid_tenant_id'});

  try{
    const query=new URLSearchParams({
      select:'id,tenant_id,label,starts_on,ends_on,archived_at',
      tenant_id:'eq.'+tenantId,
      archived_at:'is.null',
      order:'starts_on.desc'
    });
    const response=await supabaseUserFetch(token,'/rest/v1/school_years?'+query.toString());
    const data=await jsonOrNull(response);
    if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
    if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
    if(!response.ok)return res.status(502).json({ok:false,error:'upstream_error'});
    return res.status(200).json({ok:true,schoolYears:Array.isArray(data)?data:[]});
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
