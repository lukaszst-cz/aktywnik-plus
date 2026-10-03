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
      supabaseUserApiConfigured:cloud.supabaseConfigured,
      authenticationConfigured:cloud.authConfigured,
      rowLevelSecurityVerified:cloud.rlsVerified,
      personalSyncBeta:true,
      personalSyncProtocolVersion:1,
      personalSyncPull:true,
      personalSyncConflictRule:'newer_timestamp_wins',
      personalSyncDeletes:true,
      familySync:false,
      familyCloudOnboarding:cloud.enabled,
      profileContext:cloud.enabled,
      classRead:cloud.enabled,
      classLifecycleApi:cloud.enabled,
      classInviteWorkflow:cloud.enabled,
      classJoinDecisionWorkflow:cloud.enabled,
      classLifecycleUi:true,
      auditEventsIntegrated:'personal_and_class_lifecycle',
      serverBackupRestoreVerified:false
    }
  });
};
