'use strict';

async function supabaseUserFetch(token,path,options={}){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url || !key) throw new Error('supabase_not_configured');

  const headers={
    apikey:key,
    Authorization:'Bearer '+token,
    Accept:'application/json',
    ...(options.headers||{})
  };

  if(options.body && !headers['Content-Type']){
    headers['Content-Type']='application/json';
  }

  return fetch(url.replace(/\/$/,'')+path,{
    ...options,
    headers
  });
}

async function jsonOrNull(response){
  const text=await response.text();
  if(!text)return null;
  try{return JSON.parse(text)}catch{return null}
}

module.exports={supabaseUserFetch,jsonOrNull};
