'use strict';

function cloudReady(){
  const directDatabaseConfigured=Boolean(process.env.DATABASE_URL);
  const supabaseServerKey=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseConfigured=Boolean(
    process.env.SUPABASE_URL &&
    supabaseServerKey
  );
  const databaseConfigured=directDatabaseConfigured || supabaseConfigured;
  const authConfigured=Boolean(process.env.AUTH_MODE && process.env.AUTH_MODE!=='disabled');
  const rlsVerified=process.env.AKTYWNIK_RLS_VERIFIED==='true';
  const explicitEnable=process.env.AKTYWNIK_CLOUD_SYNC==='true';

  return {
    databaseConfigured,
    supabaseConfigured,
    authConfigured,
    rlsVerified,
    explicitEnable,
    enabled:explicitEnable && databaseConfigured && authConfigured && rlsVerified
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
        rowLevelSecurityVerification:!state.rlsVerified,
        explicitEnable:!state.explicitEnable
      }
    });
    return null;
  }
  return state;
}

module.exports={cloudReady,noStore,requireCloud};
