let deferredInstallPrompt=null;

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
}

function ensureInstallHelp(){
  let d=document.getElementById('installHelp');
  if(d) return d;
  d=document.createElement('dialog');
  d.id='installHelp';
  d.innerHTML=`
    <div class="install-help">
      <h2>Zainstaluj Aktywnik+</h2>
      <p id="installHelpText">Otwórz menu przeglądarki i wybierz opcję instalacji aplikacji lub dodania jej do ekranu głównego.</p>
      <div class="actions"><button id="closeInstallHelp" class="secondary">Zamknij</button></div>
    </div>`;
  document.body.appendChild(d);
  d.querySelector('#closeInstallHelp').onclick=()=>d.close();
  return d;
}

function showInstallHelp(){
  const d=ensureInstallHelp();
  const ua=navigator.userAgent||'';
  const ios=/iPad|iPhone|iPod/.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  const text=d.querySelector('#installHelpText');
  if(ios){
    text.innerHTML='Na iPhonie/iPadzie: otwórz menu <strong>Udostępnij</strong>, wybierz <strong>Dodaj do ekranu początkowego</strong> i potwierdź.';
  }else if(android){
    text.innerHTML='Na Androidzie: otwórz menu przeglądarki i wybierz <strong>Zainstaluj aplikację</strong> lub <strong>Dodaj do ekranu głównego</strong>.';
  }else{
    text.innerHTML='Na komputerze: w Chrome lub Edge użyj ikony instalacji przy pasku adresu albo menu przeglądarki → <strong>Zainstaluj Aktywnik+</strong>.';
  }
  if(typeof d.showModal==='function') d.showModal(); else alert(text.textContent);
}

async function installPwa(){
  if(isStandalone()){
    alert('Aktywnik+ jest już uruchomiony jako zainstalowana aplikacja.');
    return;
  }
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    return;
  }
  showInstallHelp();
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  document.querySelectorAll('[data-install-pwa]').forEach(b=>b.removeAttribute('disabled'));
});

window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  document.querySelectorAll('[data-install-pwa]').forEach(b=>b.textContent='Aktywnik+ zainstalowany');
});

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-install-pwa]').forEach(b=>b.addEventListener('click',installPwa));
  registerPwaWorker().catch(()=>{});
});


let pwaUpdateDetected=false;
let pwaReloadRequested=false;

function updateNoticeCopy(){
  const en=(document.documentElement.lang||'pl').toLowerCase().startsWith('en');
  return en
    ? {title:'A new Aktywnik+ version is ready',text:'Refresh to load the latest fixes. Your saved data and activity draft stay on this device.',refresh:'Refresh now',later:'Later'}
    : {title:'Nowa wersja Aktywnik+ jest gotowa',text:'Odśwież, aby wczytać najnowsze poprawki. Zapisane dane i szkic aktywności pozostaną na tym urządzeniu.',refresh:'Odśwież teraz',later:'Później'};
}

function ensurePwaUpdateNotice(){
  let box=document.getElementById('appUpdateNotice');
  if(box)return box;
  box=document.createElement('aside');
  box.id='appUpdateNotice';
  box.className='app-update-notice hidden';
  box.setAttribute('role','status');
  box.setAttribute('aria-live','polite');
  box.innerHTML='<div><strong data-update-title></strong><small data-update-text></small></div><div class="actions"><button type="button" class="primary" data-update-refresh></button><button type="button" class="ghost" data-update-later></button></div>';
  document.body.appendChild(box);
  box.querySelector('[data-update-refresh]').onclick=()=>{pwaReloadRequested=true;location.reload()};
  box.querySelector('[data-update-later]').onclick=()=>box.classList.add('hidden');
  return box;
}

function showPwaUpdateNotice(){
  const box=ensurePwaUpdateNotice(),copy=updateNoticeCopy();
  box.querySelector('[data-update-title]').textContent=copy.title;
  box.querySelector('[data-update-text]').textContent=copy.text;
  box.querySelector('[data-update-refresh]').textContent=copy.refresh;
  box.querySelector('[data-update-later]').textContent=copy.later;
  box.classList.remove('hidden');
}

async function registerPwaWorker(){
  if(!('serviceWorker' in navigator))return null;
  const registration=await navigator.serviceWorker.register('./sw.js');
  registration.addEventListener('updatefound',()=>{
    const worker=registration.installing;
    if(!worker)return;
    const replacing=!!navigator.serviceWorker.controller;
    worker.addEventListener('statechange',()=>{
      if(worker.state==='installed'&&replacing){
        pwaUpdateDetected=true;
        showPwaUpdateNotice();
      }
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(pwaReloadRequested)return;
    if(pwaUpdateDetected)showPwaUpdateNotice();
  });
  setTimeout(()=>registration.update().catch(()=>{}),1200);
  return registration;
}

window.AktywnikPwaUpdate={show:showPwaUpdateNotice,register:registerPwaWorker};
