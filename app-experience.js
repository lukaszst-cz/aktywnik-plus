'use strict';
/* Enhanced local-first interface. All activities and approvals still use app.js. */
(function(){
  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));
  const VIEWS=['add','diary','stats','data'];
  const KEY='aktywnik-plus-current-view';
  let view='add',period=7,ready=false;

  function localDay(date){
    const d=new Date(date);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function daysAgo(days){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-days);
    return localDay(d);
  }
  function entriesForChild(child){
    return (Array.isArray(state.entries)?state.entries:[])
      .filter(e=>e.childId===child?.id&&e.status!=='rejected'&&typeof e.date==='string'&&e.date<=localDay(new Date()));
  }
  function setView(next){
    if(!VIEWS.includes(next))return;
    view=next;
    try{sessionStorage.setItem(KEY,next)}catch{}
    $$('[data-app-view]').forEach(panel=>{panel.hidden=panel.dataset.appView!==next});
    $$('#childViewTabs [data-view]').forEach(button=>{
      const active=button.dataset.view===next;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    if(next==='stats')renderGoals();
    if(next==='data')renderDataHint();
    window.scrollTo?.({top:0,behavior:'instant'});
  }
  function renderStreak(){
    const child=activeChild();
    if(!child)return;
    const dates=new Set(entriesForChild(child).map(e=>e.date));
    // Today is optional: yesterday may end an active streak.
    let dayOffset=dates.has(daysAgo(0))?0:1,count=0;
    while(count<365&&dates.has(daysAgo(dayOffset))){count++;dayOffset++}
    const total=$('#streakDays');
    if(total)total.textContent=String(count);
    const grid=$('#streakWeekGrid');
    if(grid){
      const today=new Date();today.setHours(12,0,0,0);
      const monday=new Date(today);monday.setDate(today.getDate()-((today.getDay()+6)%7));
      const week=['Pn','Wt','Śr','Cz','Pt','So','Nd'];
      grid.replaceChildren(...week.map((label,i)=>{
        const date=new Date(monday);date.setDate(monday.getDate()+i);
        const iso=localDay(date),done=dates.has(iso),current=iso===localDay(today);
        const wrapper=document.createElement('div');wrapper.className='streak-day'+(done?' done':'')+(current?' current':'');
        const dot=document.createElement('span');dot.className='streak-dot';dot.textContent=done?'✓':'';
        dot.setAttribute('aria-label',iso+(done?' aktywność zapisana':' brak zapisanej aktywności'));
        const caption=document.createElement('small');caption.textContent=label;
        wrapper.append(dot,caption);return wrapper;
      }));
    }
    const msg=$('#streakMessage');
    if(msg)msg.textContent=count?'Seria trwa. Ruch w Twoim tempie.':'Dodaj aktywność, żeby rozpocząć swoją serię.';
  }
  function goalValue(child){
    const raw=Number(state.weeklyGoals?.[child?.id]||0);
    return Number.isFinite(raw)?Math.max(0,Math.min(4200,Math.round(raw))):0;
  }
  function renderGoals(){
    const child=activeChild();if(!child)return;
    const target=goalValue(child),days=Math.max(7,period),cutoff=daysAgo(days-1);
    const list=entriesForChild(child).filter(e=>e.date>=cutoff);
    const actual=list.reduce((sum,e)=>sum+Number(e.minutes||0),0);
    const activeDays=new Set(list.map(e=>e.date)).size;
    const adjustedTarget=Math.round(target*days/7);
    const percent=adjustedTarget?Math.min(100,Math.round(100*actual/adjustedTarget)):0;
    const ring=$('#goalProgressRing');
    if(ring)ring.style.setProperty('--goal-progress',String(percent)+'%');
    if($('#goalPercent'))$('#goalPercent').textContent=adjustedTarget?percent+'%':'●';
    if($('#goalMinutes'))$('#goalMinutes').textContent=actual+' min';
    if($('#goalPeriodLabel'))$('#goalPeriodLabel').textContent='Ostatnie '+days+' dni';
    if($('#goalSubtext'))$('#goalSubtext').textContent=adjustedTarget?
      'Cel: '+adjustedTarget+' min · '+activeDays+' dni z ruchem':
      'Cel nieustawiony · '+activeDays+' dni z ruchem';
    if($('#goalInput'))$('#goalInput').value=target?String(target):'';
    $$('#goalPeriodButtons [data-goal-days]').forEach(btn=>{
      const active=Number(btn.dataset.goalDays)===period;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',String(active));
    });
    const note=$('#goalNote');
    if(note)note.textContent=target?'To prywatny, dobrowolny cel. Zapisuje się na tym urządzeniu i w kopii JSON.':'Cel jest dobrowolny. Możesz śledzić ruch również bez wyznaczania celu.';
  }
  function renderDataHint(){
    const card=$('#familyDataCard');
    if(card)card.hidden=isSelfMode();
  }
  function updateHeader(){
    const child=activeChild();
    const name=child?.displayName||'';
    const initial=$('#navProfileInitial');
    if(initial)initial.textContent=(name.trim().charAt(0)||'•').toUpperCase();
    const signed=!!window.AktywnikAuth?.readSession?.();
    const signOut=$('#signOutBtn');
    if(signOut)signOut.classList.toggle('hidden',!signed);
    const nav=$('#childViewTabs');
    if(nav)nav.hidden=!appReady()||currentMode!=='child';
    const quick=$('#quickTimerCard');
    if(quick)quick.classList.toggle('hidden',!!state.activeTimer);
  }
  function refresh(){
    if(!ready)return;
    updateHeader();
    if(!appReady())return;
    renderStreak();
    renderGoals();
    renderDataHint();
  }
  function init(){
    if(ready)return;
    ready=true;
    try{const saved=sessionStorage.getItem(KEY);if(VIEWS.includes(saved))view=saved}catch{}
    $$('#childViewTabs [data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
    $$('#goalPeriodButtons [data-goal-days]').forEach(btn=>btn.addEventListener('click',()=>{
      period=Number(btn.dataset.goalDays)||7;renderGoals();
    }));
    $('#saveGoalBtn')?.addEventListener('click',()=>{
      const child=activeChild();if(!child)return;
      const input=$('#goalInput');
      const v=Number(input?.value||0);
      if(!Number.isFinite(v)||v<0||v>4200||!Number.isInteger(v)){
        if($('#goalFormStatus'))$('#goalFormStatus').textContent='Podaj liczbę minut od 0 do 4200.';return;
      }
      state.weeklyGoals={...(state.weeklyGoals||{}),[child.id]:v};
      persist({skipSync:true});
      if($('#goalFormStatus'))$('#goalFormStatus').textContent=v?'Cel zapisany lokalnie.':'Cel usunięty.';
    });
    $('#quickTimerStartBtn')?.addEventListener('click',()=>{
      setView('add');
      if(state.activeTimer){
        $('#timerStatusCard')?.scrollIntoView({behavior:'smooth',block:'center'});return;
      }
      if(!selected)pickActivity('Spacer');
      $('#entryCard')?.scrollIntoView({behavior:'smooth',block:'center'});
      $('#startTimerBtn')?.focus({preventScroll:true});
    });
    $('#signOutBtn')?.addEventListener('click',async()=>{
      const button=$('#signOutBtn');
      if(!window.AktywnikAuth?.readSession?.())return;
      button.disabled=true;
      try{
        await window.AktywnikAuth.signOut();
        window.AktywnikSync?.renderStatus?.();
        window.AktywnikFamilySync?.renderStatus?.();
        if($('#logoutStatus'))$('#logoutStatus').textContent='Wylogowano z chmury. Dane lokalne zachowane.';
        refresh();
      }catch(err){
        if($('#logoutStatus'))$('#logoutStatus').textContent='Nie udało się wylogować: '+String(err?.message||err);
      }finally{button.disabled=false}
    });
    $('#quickOpenDataBtn')?.addEventListener('click',()=>setView('data'));
    setView(view);refresh();
  }
  window.AktywnikExperience={refresh,setView,renderStreak,renderGoals};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();