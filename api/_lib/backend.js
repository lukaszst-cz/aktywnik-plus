'use strict';

function cloudReady(){
  const supabaseConfigured=Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_PUBLISHABLE_KEY
  );
  const directDatabaseConfigured=Boolean(process.env.DATABASE_URL);
  const databaseConfigured=supabaseConfigured || directDatabaseConfigured;
  const authMode=String(process.env.AUTH_MODE||'disabled');
  const authConfigured=authMode==='supabase' ? supabaseConfigured : Boolean(authMode && authMode!=='disabled');
  const rlsVerified=process.env.AKTYWNIK_RLS_VERIFIED==='true';
  const explicitEnable=process.env.AKTYWNIK_CLOUD_SYNC==='true';

  return {
    databaseConfigured,
    supabaseConfigured,
    directDatabaseConfigured,
    authConfigured,
    rlsVerified,
    explicitEnable,
    enabled:explicitEnable && supabaseConfigured && authConfigured && rlsVerified
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
        supabaseUserApi:!state.supabaseConfigured,
        authentication:!state.authConfigured,
        rowLevelSecurityVerification:!state.rlsVerified,
        explicitEnable:!state.explicitEnable
      }
    });
    return null;
  }
  return state;
}

function getBearerToken(req){
  const raw=req.headers?.authorization || req.headers?.Authorization || '';
  const match=String(raw).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function requireBearer(req,res){
  const token=getBearerToken(req);
  if(!token){
    res.status(401).json({ok:false,error:'authentication_required'});
    return null;
  }
  return token;
}

module.exports={cloudReady,noStore,requireCloud,getBearerToken,requireBearer};
