'use strict';

(function(){
  const STORAGE_KEY='aktywnik-plus-cloud-session-v1';
  const cfg=window.AKTYWNIK_AUTH_CONFIG||{};
  let authRevision=0;
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
    authRevision++;
    window.dispatchEvent(new Event('aktywnik:authchange'));
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
    let res;
    try{res=await fetch(url,options)}
    catch(err){
      if(err instanceof TypeError || err?.name==='TypeError')throw Object.assign(
        new Error('Brak połączenia z Supabase (przeglądarka zablokowała żądanie lub serwer jest niedostępny). Sprawdź diagnostykę połączenia poniżej.'),
        {networkError:true}
      );
      throw err;
    }
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok){
      const error=new Error(data?.msg||data?.message||data?.error_description||data?.error||('HTTP '+res.status));
      error.status=res.status;
      throw error;
    }
    return data;
  }
  async function refresh(session){
    if(!session?.refresh_token)return null;
    const revision=authRevision;
    const data=await jsonFetch(authBase()+'/token?grant_type=refresh_token',{
      method:'POST',headers:headers(),body:JSON.stringify({refresh_token:session.refresh_token})
    });
    const next={
      access_token:data.access_token,
      refresh_token:data.refresh_token||session.refresh_token,
      token_type:data.token_type||'bearer',
      expires_at:Date.now()+Math.max(60,Number(data.expires_in||3600)-30)*1000
    };
    if(revision!==authRevision)return null;
    writeSession(next);return next;
  }
  async function validSession(){
    let session=readSession();if(!session)return null;
    if(!session.expires_at||Date.now()>session.expires_at){
      const revision=authRevision;
      try{session=await refresh(session)}catch(err){
        if(revision===authRevision && [400,401,403].includes(err?.status))writeSession(null);
        return null;
      }
    }
    return session;
  }
  async function currentUser(){
    const session=await validSession();if(!session)return null;
    const revision=authRevision;
    try{return await jsonFetch(authBase()+'/user',{headers:headers(session.access_token)})}
    catch(err){
      if(revision===authRevision && [401,403].includes(err?.status))writeSession(null);
      return null;
    }
  }
  async function sendMagicLink(email){
    const clean=String(email||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(clean))throw new Error('Podaj poprawny adres e-mail.');
    const redirectTo=new URL(cfg.redirectPath||'/konto.html',location.origin).href;
    // GoTrue odczytuje redirect_to z query string, a nie z JSON body.
    return jsonFetch(authBase()+'/otp?redirect_to='+encodeURIComponent(redirectTo),{
      method:'POST',
      headers:headers(),
      body:JSON.stringify({email:clean,create_user:true})
    });
  }
  async function signInWithPassword(email,password){
    const clean=String(email||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(clean))throw new Error('Podaj poprawny adres e-mail.');
    if(!password)throw new Error('Wpisz hasło konta.');
    const data=await jsonFetch(authBase()+'/token?grant_type=password',{
      method:'POST',headers:headers(),body:JSON.stringify({email:clean,password})
    });
    if(!data?.access_token||!data?.refresh_token)throw new Error('Serwer nie zwrócił poprawnej sesji.');
    writeSession({
      access_token:data.access_token,refresh_token:data.refresh_token,
      token_type:data.token_type||'bearer',
      expires_at:Date.now()+Math.max(60,Number(data.expires_in||3600)-30)*1000
    });
    return data;
  }
  function signInWithGoogle(){
    if(!cfg.supabaseUrl||!cfg.publishableKey)throw new Error('Brak konfiguracji Supabase.');
    const redirectTo=new URL(cfg.redirectPath||'/konto.html',location.origin).href;
    location.assign(authBase()+'/authorize?provider=google&redirect_to='+encodeURIComponent(redirectTo));
  }
  async function checkAuthConnectivity(){
    const report=[];
    const localEndpoint='/api/health';
    for(const item of [
      {label:'Serwer Aktywnika',url:localEndpoint},
      {label:'Supabase Auth',url:authBase()+'/health'}
    ]){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
      try{
        const res=await fetch(item.url,{cache:'no-store',signal:controller.signal});
        report.push(item.label+': '+(res.ok?'połączenie OK':'HTTP '+res.status));
      }catch(err){
        report.push(item.label+': '+(err?.name==='AbortError'?'przekroczony czas':'brak połączenia / blokada przeglądarki'));
      }finally{clearTimeout(timeout)}
    }
    return report.join('; ');
  }
  async function signOut(){
    const session=readSession();
    // Wylogowanie lokalne musi zadziałać nawet bez internetu.
    writeSession(null);
    if(!session?.access_token || !cfg.supabaseUrl || !cfg.publishableKey)return;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),4000);
    try{
      await fetch(authBase()+'/logout',{
        method:'POST',headers:headers(session.access_token),signal:controller.signal
      });
    }catch(err){
      console.warn('Aktywnik+: remote logout unavailable; local session removed.');
    }finally{clearTimeout(timeout)}
  }
  function status(message,kind=''){
    const el=$('#accountStatus');if(!el)return;
    el.textContent=message;el.dataset.kind=kind;
  }
  async function render(){
    if(!cfg.supabaseUrl||!cfg.publishableKey){status(t('account.status.configMissing','Logowanie online nie jest jeszcze skonfigurowane.'),'error');return}
    const hashParams=new URLSearchParams(location.hash.replace(/^#/,''));
    const callbackError=hashParams.get('error_description')||hashParams.get('error');
    if(callbackError){
      history.replaceState({},document.title,location.pathname+location.search);
    }
    const fromHash=sessionFromHash();
    if(fromHash){
      writeSession(fromHash);
      history.replaceState({},document.title,location.pathname+location.search);
      status(t('account.status.loginConfirmed','Logowanie potwierdzone.'),'ok');
    }
    const revision=authRevision;
    const user=await currentUser();
    if(revision!==authRevision){return render()}
    const logged=$('#loggedInCard'),login=$('#loginCard');
    const logout=$('#signOutBtn');if(logout)logout.classList.toggle('hidden',!readSession());
    if(user){
      logged?.classList.remove('hidden');login?.classList.add('hidden');
      const email=$('#accountEmail');if(email)email.textContent=user.email||'konto';
      status(t('account.status.loggedIn','Konto jest zalogowane.'),'ok');
    }else{
      logged?.classList.add('hidden');login?.classList.remove('hidden');
      if(callbackError)status(t('account.status.sendFail','Nie udało się potwierdzić logowania:')+' '+String(callbackError).slice(0,180),'error');
      else if(readSession())status(t('account.status.network','Nie można chwilowo zweryfikować konta. Dane lokalne pozostają dostępne.'),'error');
      else status(t('account.status.local','Możesz zalogować się linkiem wysłanym na e-mail.'),'');
    }
  }

  window.AktywnikAuth={readSession,validSession,currentUser,sendMagicLink,signInWithPassword,signInWithGoogle,checkAuthConnectivity,signOut};

  window.addEventListener('aktywnik:languagechange',()=>render().catch(()=>{}));
  window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY)render().catch(()=>{})});
  window.addEventListener('aktywnik:authchange',()=>{
    window.AktywnikSync?.renderStatus?.();
    window.AktywnikFamilySync?.renderStatus?.();
  });

  document.addEventListener('DOMContentLoaded',()=>{
    $('#checkAuthBtn')?.addEventListener('click',async()=>{
      const btn=$('#checkAuthBtn');btn.disabled=true;
      status('Sprawdzanie połączenia…');
      try{status(await checkAuthConnectivity())}
      catch(err){status('Nie udało się sprawdzić połączenia: '+err.message,'error')}
      finally{btn.disabled=false}
    });
    $('#googleSignInBtn')?.addEventListener('click',()=>{
      try{signInWithGoogle()}catch(err){status(err.message,'error')}
    });
    $('#passwordSignInBtn')?.addEventListener('click',async()=>{
      const btn=$('#passwordSignInBtn');btn.disabled=true;
      try{
        await signInWithPassword($('#accountEmailInput')?.value,$('#accountPasswordInput')?.value);
        if($('#accountPasswordInput'))$('#accountPasswordInput').value='';
        await render();status('Zalogowano na konto.','ok');
      }catch(err){status('Nie udało się zalogować: '+err.message,'error')}
      finally{btn.disabled=false}
    });
    $('#sendMagicLinkBtn')?.addEventListener('click',async()=>{
      const btn=$('#sendMagicLinkBtn');btn.disabled=true;
      try{
        await sendMagicLink($('#accountEmailInput')?.value);
        status(t('account.status.sent','Zlecenie wysyłki przyjęte. Sprawdź pocztę i folder spam. Dostarczenie zależy od ustawień poczty Supabase.'),'ok');
      }catch(err){
        let message=String(err?.message||'');
        if(err?.status===429)message=t('account.status.rateLimit','Limit wiadomości został osiągnięty. Spróbuj później lub skontaktuj się z administratorem.');
        if(!navigator.onLine)message=t('account.status.offline','Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.');
        status(t('account.status.sendFail','Nie udało się wysłać linku:')+' '+message,'error');
      }
      finally{btn.disabled=false}
    });
    $('#signOutBtn')?.addEventListener('click',async()=>{
      const btn=$('#signOutBtn');if(btn)btn.disabled=true;
      try{
        await signOut();await render();status(t('account.status.loggedOut','Wylogowano. Dane lokalne pozostają na urządzeniu.'),'ok');
      }catch(err){status(t('account.status.error','Błąd konta:')+' '+err.message,'error')}
      finally{if(btn)btn.disabled=false}
    });
    render().catch(err=>status(t('account.status.error','Błąd konta:')+' '+err.message,'error'));
  });
})();
