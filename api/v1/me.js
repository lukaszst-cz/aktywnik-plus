'use strict';

const {noStore,requireCloud,requireBearer}=require('../_lib/backend');
const {supabaseUserFetch,jsonOrNull}=require('../_lib/supabase');

module.exports = async function handler(req,res){
  noStore(res);

  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  if(!requireCloud(res)) return;
  const token=requireBearer(req,res);
  if(!token) return;

  try{
    const [profileResponse,membershipResponse]=await Promise.all([
      supabaseUserFetch(token,'/rest/v1/profiles?select=id,display_name,profile_type&limit=1'),
      supabaseUserFetch(token,'/rest/v1/memberships?select=tenant_id,role,active')
    ]);

    if(profileResponse.status===401 || membershipResponse.status===401){
      return res.status(401).json({ok:false,error:'invalid_session'});
    }
    if(!profileResponse.ok || !membershipResponse.ok){
      return res.status(502).json({ok:false,error:'upstream_error'});
    }

    const profiles=await jsonOrNull(profileResponse);
    const memberships=await jsonOrNull(membershipResponse);

    return res.status(200).json({
      ok:true,
      profile:Array.isArray(profiles)?(profiles[0]||null):null,
      memberships:Array.isArray(memberships)?memberships:[]
    });
  }catch{
    return res.status(502).json({ok:false,error:'supabase_unavailable'});
  }
};
