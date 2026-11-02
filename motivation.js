/* Aktywnik+ motivation panel. No external APIs or tracking. */
(function(){
  'use strict';
  const PERIODS={'7':7,'14':14,'21':21,month:null};
  let selected='7';
  const el=id=>document.getElementById(id);
  function dayKey(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function addDays(d,n){
    const out=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
    out.setDate(out.getDate()+n);
    return out;
  }
  function dayNumber(d){
    return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
  }
  function bounds(period,at=new Date()){
    if(period==='month'){
      const start=new Date(at.getFullYear(),at.getMonth(),1,12);
      const end=new Date(at.getFullYear(),at.getMonth()+1,1,12);
      const previousStart=new Date(at.getFullYear(),at.getMonth()-1,1,12);
      return {start,end,previousStart,previousEnd:start};
    }
    const days=PERIODS[period];
    if(!days)throw new Error('Nieznany okres aktywności.');
    const monday=addDays(at,-(at.getDay()+6)%7);
    const anchor=new Date(2024,0,1,12);
    const weeks=Math.floor((dayNumber(monday)-dayNumber(anchor))/7);
    const weeksInPeriod=days/7;
    const start=addDays(monday,-((weeks%weeksInPeriod)+weeksInPeriod)%weeksInPeriod*7);
    return {start,end:addDays(start,days),previousStart:addDays(start,-days),previousEnd:start};
  }
  function validEntry(e,childId){
    return e && e.childId===childId && e.status!=='rejected' &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(e.date||'')) &&
      Number.isFinite(Number(e.minutes)) && Number(e.minutes)>0 && Number(e.minutes)<=600;
  }
  function minutesFor(entries,childId,start,end,todayKey){
    const from=dayKey(start),to=dayKey(end);
    return entries.reduce((sum,e)=>sum+(validEntry(e,childId)&&e.date>=from&&e.date<to&&e.date<=todayKey?Number(e.minutes):0),0);
  }
  function compute(entries,childId,period,at=new Date()){
    const periodDates=bounds(period,at);
    const todays=dayKey(at);
    const total=minutesFor(entries,childId,periodDates.start,periodDates.end,todays);
    const elapsed=Math.min(dayNumber(periodDates.end)-dayNumber(periodDates.start),Math.max(0,dayNumber(at)-dayNumber(periodDates.start)+1));
    const lastDays=Math.min(elapsed,dayNumber(periodDates.previousEnd)-dayNumber(periodDates.previousStart));
    const comparableEnd=addDays(periodDates.previousStart,lastDays);
    const previous=minutesFor(entries,childId,periodDates.previousStart,comparableEnd,todays);
    const allPrevious=minutesFor(entries,childId,periodDates.previousStart,periodDates.previousEnd,todays);
    const valid=entries.filter(e=>validEntry(e,childId)&&e.date>=dayKey(periodDates.start)&&e.date<dayKey(periodDates.end)&&e.date<=todays);
    return {total,previous,allPrevious,activeDays:new Set(valid.map(e=>e.date)).size,activities:valid.length,elapsed,start:dayKey(periodDates.start),end:dayKey(addDays(periodDates.end,-1))};
  }
  function streak(entries,childId,at=new Date()){
    const days=new Set(entries.filter(e=>validEntry(e,childId)).map(e=>e.date));
    let cursor=new Date(at.getFullYear(),at.getMonth(),at.getDate(),12);
    if(!days.has(dayKey(cursor)))cursor=addDays(cursor,-1);
    let count=0;
    while(days.has(dayKey(cursor))&&count<3660){count++;cursor=addDays(cursor,-1);}
    return count;
  }
  function setText(id,value){const node=el(id);if(node)node.textContent=String(value);}
  function fmt(value){return Math.round(value)+' min';}
  function render(){
    const bridge=window.AktywnikMotivationBridge;
    const node=el('motivationCard');
    if(!bridge||!node)return;
    const state=bridge.snapshot();
    if(!state?.child){node.classList.add('hidden');return;}
    node.classList.remove('hidden');
    const entries=Array.isArray(state.entries)?state.entries:[];
    const child=state.child;
    const result=compute(entries,child.id,selected);
    const goal=Math.max(0,Math.round(Number(child.motivationGoals?.[selected]||0)));
    const progress=goal?Math.min(100,Math.round(100*result.total/goal)):0;
    setText('motivationStreak',streak(entries,child.id));
    setText('motivationCurrent',fmt(result.total));
    setText('motivationPrevious',fmt(result.previous));
    setText('motivationPeriodDate',result.start+' do '+result.end);
    setText('motivationEntryCount',result.activities+' aktywności, '+result.activeDays+' aktywnych dni');
    setText('motivationGoalInfo',goal?(fmt(result.total)+' z '+fmt(goal)+' · '+progress+'%'):'Cel nie jest ustawiony. Możesz ustalić go samodzielnie.');
    const progressNode=el('motivationProgress');
    if(progressNode){progressNode.value=progress;progressNode.setAttribute('aria-valuenow',String(progress));}
    const input=el('motivationGoalInput');if(input)input.value=goal?String(goal):'';
    const comparison=el('motivationComparison');
    if(comparison){
      const change=Math.round(result.total-result.previous);
      comparison.textContent=(change>0?'+'+change:change)+' min względem takiego samego fragmentu poprzedniego okresu';
      comparison.dataset.trend=change>0?'up':change<0?'down':'same';
    }
    const note=el('motivationSummaryNote');
    if(note)note.textContent=result.activities?
      'Liczymy każdy zapisany ruch, także wpisy oczekujące na zatwierdzenie. Dni odpoczynku są naturalną częścią treningu.':
      'Każdy ruch się liczy. Zacznij od aktywności, którą lubisz.';
    document.querySelectorAll('[data-motivation-period]').forEach(btn=>{
      const active=btn.dataset.motivationPeriod===selected;
      btn.classList.toggle('selected',active);
      btn.setAttribute('aria-pressed',String(active));
    });
    document.querySelectorAll('[data-club-start]').forEach(btn=>btn.disabled=!!state.activeTimer);
  }
  function bind(){
    document.querySelectorAll('[data-motivation-period]').forEach(btn=>btn.addEventListener('click',()=>{
      if(!Object.hasOwn(PERIODS,btn.dataset.motivationPeriod))return;
      selected=btn.dataset.motivationPeriod;render();
    }));
    el('motivationSaveGoal')?.addEventListener('click',()=>{
      const input=el('motivationGoalInput');
      if(!input)return;
      const raw=input.value.trim();
      if(raw && (!/^\d+$/.test(raw)||Number(raw)<10||Number(raw)>6000)){
        setText('motivationGoalFeedback','Cel musi wynosić od 10 do 6000 minut albo pozostawać pusty.');return;
      }
      const value=raw?Number(raw):0;
      const saved=window.AktywnikMotivationBridge?.setGoal(selected,value);
      setText('motivationGoalFeedback',saved?'Cel zapisano na tym urządzeniu i w kopii JSON.':'Nie można zapisać celu.');
      render();
    });
    document.querySelectorAll('[data-club-start]').forEach(btn=>btn.addEventListener('click',()=>{
      const started=window.AktywnikMotivationBridge?.startClub(btn.dataset.clubStart);
      if(!started)setText('motivationClubFeedback','Zakończ najpierw bieżący pomiar albo wybierz profil.');
      else {
        setText('motivationClubFeedback','Pomiar rozpoczęty. Zatrzymaj go po treningu, aby zapisać czas.');
        el('timerStatusCard')?.scrollIntoView({behavior:'smooth',block:'center'});
      }
      render();
    }));
    render();
  }
  window.AktywnikMotivation={compute,streak,bounds,render};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
