'use strict';

const {cloudReady}=require('./_lib/backend');

module.exports = function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }

  const cloud=cloudReady();

  return res.status(200).json({
    ok:true,
    service:'aktywnik-plus-api',
    version:'0.5.0-beta.4',
    environment:process.env.VERCEL_ENV || 'local',
    backend:'full-family-sync-pilot',
    databaseConfigured:cloud.databaseConfigured,
    authConfigured:cloud.authConfigured,
    rlsVerified:cloud.rlsVerified,
    cloudSyncEnabled:cloud.enabled,
    timestamp:new Date().toISOString()
  });
};
