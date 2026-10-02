function projectRootUrl(){
  return new URL('./', window.location.href).href;
}
async function sharePilot(){
  const url=projectRootUrl();
  const data={
    title:'Aktywnik+',
    text:'Aktywnik+ — bezpłatny projekt rodzicielski do prowadzenia i raportowania dodatkowej aktywności dzieci.',
    url
  };
  const status=document.getElementById('shareStatus');
  try{
    if(navigator.share){
      await navigator.share(data);
      if(status)status.textContent='Link udostępniony.';
    }else{
      await navigator.clipboard.writeText(url);
      if(status)status.textContent='Link skopiowany do schowka.';
    }
  }catch(e){
    if(e?.name!=='AbortError' && status)status.textContent='Nie udało się udostępnić. Użyj przycisku Kopiuj link.';
  }
}
async function copyPilotLink(){
  const status=document.getElementById('shareStatus');
  try{
    await navigator.clipboard.writeText(projectRootUrl());
    if(status)status.textContent='Link skopiowany do schowka.';
  }catch{
    if(status)status.textContent=projectRootUrl();
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('sharePilotBtn')?.addEventListener('click',sharePilot);
  document.getElementById('copyPilotLinkBtn')?.addEventListener('click',copyPilotLink);
});
