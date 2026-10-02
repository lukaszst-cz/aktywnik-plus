'use strict';

function cloudReady(){
  const databaseConfigured=Boolean(process.env.DATABASE_URL || process.env.SUPABASE_URL);
  const authConfigured=Boolean(process.env.AUTH_MODE && process.env.AUTH_MODE!=='disabled');
  return {
    databaseConfigured,
    authConfigured,
    enabled:process.env.AKTYWNIK_CLOUD_SYNC==='true' && databaseConfigured && authConfigured
  };
}

function noStore(res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
}

function requireCloud(res){
  const state=cloudReady();
  if(!state.enabled){
    res.status(503).json({
      ok:false,
      error:'cloud_sync_disabled',
      message:'Synchronizacja chmurowa nie jest jeszcze aktywna.',
      requires:{
        database:!state.databaseConfigured,
        authentication:!state.authConfigured,
        explicitEnable:process.env.AKTYWNIK_CLOUD_SYNC!=='true'
      }
    });
    return null;
  }
  return state;
}

module.exports={cloudReady,noStore,requireCloud};
