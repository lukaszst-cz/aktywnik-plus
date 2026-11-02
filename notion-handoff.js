'use strict';

// Manual, privacy-first handoff: no Notion API token and no automatic upload.
(function(){
  const $=id=>document.getElementById(id);
  let last=null;
  const labels={approved:'Zatwierdzona',pending:'Oczekuje na zatwierdzenie rodzica',rejected:'Odrzucona'};
  function snapshot(){return window.AktywnikMotivationBridge?.snapshot?.()||null;}
  function feedback(text){const el=$('activityNotionFeedback');if(el)el.textContent=text;}
  function entryText(entry){
    const lines=[
      'Aktywnik+ · wpis aktywności',
      'Data: '+entry.date,
      'Aktywność: '+entry.activity,
      'Czas: '+entry.minutes+' min',
      'Status: '+(labels[entry.status]||entry.status),
      'Źródło: '+(entry.source==='timer'?'Start/Stop':'Ręczny')
    ];
    if(entry.note)lines.push('Notatka: '+entry.note);
    return lines.join('\n');
  }
  function urlSafe(raw){
    try{
      const url=new URL(raw);
      return url.protocol==='https:'&&['app.notion.com','notion.so','www.notion.so'].includes(url.hostname)?url.href:null;
    }catch{return null}
  }
  function renderLink(){
    const child=snapshot()?.child||null;
    const url=urlSafe(child?.notionUrl||'');
    const input=$('activityNotionUrl'),link=$('activityOpenNotion');
    if(input)input.value=url||'';
    if(link){
      if(url){link.href=url;link.classList.remove('hidden');}
      else{link.removeAttribute('href');link.classList.add('hidden');}
    }
  }
  function onSaved(event){
    const raw=event?.detail,child=snapshot()?.child;
    if(!raw||!child||raw.childId!==child.id)return;
    const minutes=Number(raw.minutes);
    if(!Number.isFinite(minutes)||minutes<=0)return;
    last={
      date:String(raw.date||'').slice(0,10),
      activity:String(raw.activity||'').slice(0,80),
      minutes:Math.round(minutes),
      note:String(raw.note||'').slice(0,120),
      status:String(raw.status||'pending'),
      source:raw.source==='timer'?'timer':'manual'
    };
    const card=$('activitySavedCard');
    if(!card)return;
    card.classList.remove('hidden');
    $('activitySavedSummary').textContent=last.activity+' · '+last.minutes+' min · '+(labels[last.status]||last.status)+'.';
    feedback('');
    renderLink();
    card.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }
  async function copyEntry(){
    if(!last)return;
    const value=entryText(last);
    let ok=false;
    try{
      await navigator.clipboard.writeText(value);
      ok=true;
    }catch{}
    if(!ok){
      const area=document.createElement('textarea');
      area.value=value;
      area.style.position='fixed';area.style.left='-9999px';
      document.body.appendChild(area);
      area.select();
      try{ok=document.execCommand('copy')}catch{}
      area.remove();
    }
    feedback(ok
      ?'Wpis skopiowany. Otwórz dziennik Notion i wklej go w wybranym miejscu.'
      :'Nie udało się skopiować wpisu. Sprawdź uprawnienia schowka przeglądarki.');
  }
  function saveDestination(){
    const raw=String($('activityNotionUrl')?.value||'').trim();
    if(raw&&!urlSafe(raw)){feedback('Podaj adres strony Notion zaczynający się od https://www.notion.so lub https://app.notion.com.');return;}
    if(!window.AktywnikMotivationBridge?.setNotionUrl?.(raw)){
      feedback('Nie udało się zapisać adresu. Spróbuj ponownie.');return;
    }
    renderLink();
    feedback(raw?'Zapisano stronę Notion dla bieżącego profilu na tym urządzeniu.':'Usunięto zapisany adres Notion.');
  }
  function init(){
    $('activityCopyNotionBtn')?.addEventListener('click',copyEntry);
    $('activitySaveNotionUrl')?.addEventListener('click',saveDestination);
    $('activitySavedClose')?.addEventListener('click',()=>$('activitySavedCard')?.classList.add('hidden'));
    renderLink();
  }
  window.addEventListener('aktywnik:entrysaved',onSaved);
  window.AktywnikNotionHandoff={entryText,urlSafe};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
