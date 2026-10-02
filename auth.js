'use strict';

(function(){
  const STORAGE_KEY='aktywnik-plus-cloud-session-v1';
  const cfg=window.AKTYWNIK_AUTH_CONFIG||{};
  const $=s=>document.querySelector(s);
  function t(key,fallback){
    const i18n=window.AktywnikI18n;
    const lang=i18n?.getLanguage?.()||document.documentElement.lang||'pl';
    return i18n?.messages?.[lang]?.[key]||fallback;
  }

  function authBase(){return String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/auth/v1'}
  function headers(accessToken){
    const h={'apikey':cfg.publishableKey,'Content-Type':'application/json'};
    if(accessToken)h.Authorization='Bearer '+accessToken;
    return h;
  }
  function readSession(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
  }
  function writeSession(session){
    if(session)localStorage.setItem(STORAGE_KEY,JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }
  function sessionFromHash(){
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
    if(!access_token||!refresh_token)return null;
    const expires_in=Number(hash.get('expires_in')||3600);
    return {
      access_token,refresh_token,
      token_type:hash.get('token_type')||'bearer',
      expires_at:Date.now()+Math.max(60,expires_in-30)*1000
    };
  }
  async function jsonFetch(url,options={}){
    const res=await fetch(url,options);
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||('HTTP '+res.status));
    return data;
  }
  async function refresh(session){
    if(!session?.refresh_token)return null;
    const data=await jsonFetch(authBase()+'/token?grant_type=refresh_token',{
      method:'POST',headers:headers(),body:JSON.stringify({refresh_token:session.refresh_token})
    });
    const next={
      access_token:data.access_token,
      refresh_token:data.refresh_token||session.refresh_token,
      token_type:data.token_type||'bearer',
      expires_at:Date.now()+Math.max(60,Number(data.expires_in||3600)-30)*1000
    };
    writeSession(next);return next;
  }
  async function validSession(){
    let session=readSession();if(!session)return null;
    if(!session.expires_at||Date.now()>session.expires_at){
      try{session=await refresh(session)}catch{writeSession(null);return null}
    }
    return session;
  }
  async function currentUser(){
    const session=await validSession();if(!session)return null;
    try{return await jsonFetch(authBase()+'/user',{headers:headers(session.access_token)})}
    catch{writeSession(null);return null}
  }
  async function sendMagicLink(email){
    const clean=String(email||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(clean))throw new Error('Podaj poprawny adres e-mail.');
    const redirectTo=new URL(cfg.redirectPath||'/konto.html',location.origin).href;
    return jsonFetch(authBase()+'/otp',{
      method:'POST',
      headers:headers(),
      body:JSON.stringify({email:clean,create_user:true,redirect_to:redirectTo})
    });
  }
  async function signOut(){
    const session=readSession();
    try{
      if(session?.access_token)await fetch(authBase()+'/logout',{method:'POST',headers:headers(session.access_token)});
    }finally{writeSession(null)}
  }
  function status(message,kind=''){
    const el=$('#accountStatus');if(!el)return;
    el.textContent=message;el.dataset.kind=kind;
  }
  async function render(){
    if(!cfg.supabaseUrl||!cfg.publishableKey){status(t('account.status.configMissing','Logowanie online nie jest jeszcze skonfigurowane.'),'error');return}
    const fromHash=sessionFromHash();
    if(fromHash){
      writeSession(fromHash);
      history.replaceState({},document.title,location.pathname+location.search);
      status(t('account.status.loginConfirmed','Logowanie potwierdzone.'),'ok');
    }
    const user=await currentUser();
    const logged=$('#loggedInCard'),login=$('#loginCard');
    if(user){
      logged?.classList.remove('hidden');login?.classList.add('hidden');
      const email=$('#accountEmail');if(email)email.textContent=user.email||'konto';
      status(t('account.status.loggedIn','Konto jest zalogowane.'),'ok');
    }else{
      logged?.classList.add('hidden');login?.classList.remove('hidden');
      status(t('account.status.local','Możesz zalogować się linkiem wysłanym na e-mail.'),'');
    }
  }

  window.AktywnikAuth={readSession,validSession,currentUser,sendMagicLink,signOut};

  window.addEventListener('aktywnik:languagechange',()=>render().catch(()=>{}));

  document.addEventListener('DOMContentLoaded',()=>{
    $('#sendMagicLinkBtn')?.addEventListener('click',async()=>{
      const btn=$('#sendMagicLinkBtn');btn.disabled=true;
      try{
        await sendMagicLink($('#accountEmailInput')?.value);
        status(t('account.status.sent','Link logowania został wysłany.'),'ok');
      }catch(err){status(t('account.status.sendFail','Nie udało się wysłać linku:')+' '+err.message,'error')}
      finally{btn.disabled=false}
    });
    $('#signOutBtn')?.addEventListener('click',async()=>{
      await signOut();status(t('account.status.loggedOut','Wylogowano.'),'ok');await render();
    });
    render().catch(err=>status(t('account.status.error','Błąd konta:')+' '+err.message,'error'));
  });
})();
