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
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
