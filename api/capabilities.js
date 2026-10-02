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
    localPilot:true,
    parentPinLocal:true,
    reports:{pdf:true,csv:true,jsonBackup:true},
    paperImport:{csv:true,json:true,textOcr:true},
    cloud:{
      enabled:cloud.enabled,
      databaseConfigured:cloud.databaseConfigured,
      authenticationConfigured:cloud.authConfigured,
      rowLevelSecurityVerified:cloud.rlsVerified,
      classes:cloud.enabled,
      crossDeviceSync:cloud.enabled,
      serverBackups:cloud.enabled
    }
  });
};
