'use strict';

const {supabaseUserFetch,jsonOrNull}=require('./supabase');

function missingRpc(response,data){
  const message=String(data?.message||'');
  return response?.status===404&&(
    data?.code==='PGRST202'||
    /could not find the function/i.test(message)
  );
}

async function postRpcWithIdempotentFallback(token,{
  idempotentPath,
  idempotentBody,
  legacyPath,
  legacyBody
}){
  const first=await supabaseUserFetch(token,idempotentPath,{
    method:'POST',
    body:JSON.stringify(idempotentBody)
  });
  const firstData=await jsonOrNull(first);

  if(!missingRpc(first,firstData)){
    return {response:first,data:firstData,idempotency:'active'};
  }

  const fallback=await supabaseUserFetch(token,legacyPath,{
    method:'POST',
    body:JSON.stringify(legacyBody)
  });
  const fallbackData=await jsonOrNull(fallback);
  return {response:fallback,data:fallbackData,idempotency:'legacy_fallback'};
}

module.exports={missingRpc,postRpcWithIdempotentFallback};
