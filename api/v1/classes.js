'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');

module.exports = async function handler(req,res){
  noStore(res);
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res))return;
  const token=requireBearer(req,res);
  if(!token)return;

  try{
    const response=await supabaseUserFetch(
      token,
      '/rest/v1/classes?select=id,name,tenant_id,school_year_id,archived_at&order=name.asc'
    );
    const data=await jsonOrNull(response);

    if(response.status===401)return res.status(401).json({ok:false,error:'invalid_session'});
    if(response.status===403)return res.status(403).json({ok:false,error:'forbidden'});
    if(!response.ok)return res.status(502).json({ok:false,error:'upstream_error'});

    return res.status(200).json({ok:true,classes:Array.isArray(data)?data:[]});
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
