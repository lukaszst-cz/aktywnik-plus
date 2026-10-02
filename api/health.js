'use strict';

module.exports = function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  const databaseConfigured=Boolean(process.env.DATABASE_URL || process.env.SUPABASE_URL);
  const authConfigured=process.env.AUTH_MODE && process.env.AUTH_MODE!=='disabled';
  const cloudSyncEnabled=process.env.AKTYWNIK_CLOUD_SYNC==='true';

  return res.status(200).json({
    ok:true,
    service:'aktywnik-plus-api',
    version:'0.1.3',
    environment:process.env.VERCEL_ENV || 'local',
    backend:'scaffold',
    databaseConfigured,
    authConfigured:Boolean(authConfigured),
    cloudSyncEnabled,
    timestamp:new Date().toISOString()
  });
};
