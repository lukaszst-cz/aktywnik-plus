/* Small playful modules based on existing activity records, without public rankings. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const cards=[
 {activity:'Piłka nożna',emoji:'⚽',title:'Piłka'},
 {activity:'Rower',emoji:'🚲',title:'Rower'},
 {activity:'Bieganie',emoji:'🏃',title:'Bieg'},
 {activity:'Basen',emoji:'🏊',title:'Pływanie'},
 {activity:'Taniec',emoji:'💃',title:'Taniec'},
 {activity:'Spacer',emoji:'🚶',title:'Spacer'},
 {activity:'Gimnastyka',emoji:'🤸',title:'Ruch'},
 {activity:'Inna aktywność',emoji:'✨',title:'Więcej'}
];
const modules=[
 {name:'Wyzwania',emoji:'🏔️',desc:'Małe przygody ruchowe',go:'challenges'},
 {name:'Odznaki',emoji:'🏆',desc:'Twoje odkrycia i postępy',go:'badges'},
 {name:'Kalendarz',emoji:'📅',desc:'Zobacz dni z ruchem',go:'calendar'},
 {name:'Odkrywaj',emoji:'💡',desc:'Wylosuj nowy pomysł',go:'surprise'}
];
function element(tag,cls,text){
 const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
}
function availableEntries(){
 const child=activeChild();if(!child)return [];
 return state.entries.filter(e=>e.childId===child.id&&e.status!=='rejected'&&allowedActivityDate(e.date));
}
function stats(){
 const entries=availableEntries(),days=new Set(entries.map(e=>e.date)),types=new Set(entries.map(e=>e.activity));
 const current=Date.now(),recent=entries.filter(e=>current-new Date(e.date+'T12:00:00').getTime()<7*86400000);
 return {entries,days,types,recent,minutes:recent.reduce((n,e)=>n+Number(e.minutes||0),0)};
}
function renderActivities(){
 const box=$('#playfulActivities');if(!box)return;
 box.replaceChildren(...cards.map(item=>{
  const button=element('button','playful-chip');
  button.type='button';button.dataset.activity=item.activity;
  button.append(element('span','illustration',item.emoji),element('span','',item.title));
  button.addEventListener('click',()=>{
   window.AktywnikExperience?.setView?.('add');
   pickActivity(item.activity);
   $('#entryCard')?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  return button;
 }));
}
function renderModuleLinks(){
 const box=$('#illustratedModules');if(!box)return;
 box.replaceChildren(...modules.map(item=>{
  const button=element('button','illustrated-module');
  button.type='button';button.dataset.module=item.go;
  const texts=element('span');
  texts.append(element('strong','',item.name),element('small','',item.desc));
  button.append(element('span','illustration',item.emoji),texts);
  button.addEventListener('click',()=>open(item.go));
  return button;
 }));
}
function renderBadges(){
 const box=$('#adventureBadges');if(!box)return;
 const st=stats(),badges=[
  {emoji:'🌟',name:'Pierwszy krok',earned:st.entries.length>0},
  {emoji:'🧭',name:'Odkrywca',earned:st.types.size>=3},
  {emoji:'🌱',name:'Trzy dni ruchu',earned:st.days.size>=3},
  {emoji:'🚲',name:'Wyprawa',earned:st.types.size>=5},
  {emoji:'🗓️',name:'Siedem dni',earned:st.days.size>=7},
  {emoji:'🏆',name:'Dziesięć odkryć',earned:st.entries.length>=10}
 ];
 box.replaceChildren(...badges.map(x=>{
  const tile=element('div','badge-tile'+(x.earned?' earned':''));
  tile.append(element('span','illustration',x.emoji),element('strong','',x.name),element('small','',x.earned?'Zdobyta ✓':'Jeszcze przed Tobą'));
  return tile;
 }));
 const progress=$('#badgesProgress');if(progress)progress.textContent=badges.filter(x=>x.earned).length+' / '+badges.length;
}
function renderChallenges(){
 const st=stats(),grid=$('#adventureChallenges');if(!grid)return;
 const items=[
  {emoji:'👟',name:'Pierwszy ruch',desc:'Zapisz dowolną aktywność',done:st.entries.length>0},
  {emoji:'🌈',name:'Spróbuj trzech rzeczy',desc:'Poznaj 3 rodzaje aktywności',done:st.types.size>=3},
  {emoji:'🌱',name:'Ruch w trzech dniach',desc:'Zapisz aktywność w 3 różnych dniach',done:st.days.size>=3},
  {emoji:'⏱️',name:'Chwila dla ruchu',desc:'Zbierz 30 minut w ostatnich 7 dniach',done:st.minutes>=30}
 ];
 grid.replaceChildren(...items.map(x=>{
  const tile=element('div','mini-challenge'+(x.done?' done':''));
  const label=element('div');label.append(element('strong','',x.name+(x.done?' ✓':'')),element('small','',x.desc));
  tile.append(element('span','illustration',x.emoji),label);return tile;
 }));
}
function renderCalendar(){
 const box=$('#adventureCalendar');if(!box)return;
 const st=stats(),now=new Date();now.setHours(12,0,0,0);
 const month=new Date(now.getFullYear(),now.getMonth(),1);
 const offset=(month.getDay()+6)%7;
 const length=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
 box.replaceChildren();
 const container=element('div','calendar-grid');
 for(const day of ['Pn','Wt','Śr','Cz','Pt','So','Nd'])container.append(element('small','',day));
 for(let i=0;i<offset;i++)container.append(element('span','calendar-blank'));
 for(let n=1;n<=length;n++){
  const dt=new Date(now.getFullYear(),now.getMonth(),n,12);
  const date=[dt.getFullYear(),String(dt.getMonth()+1).padStart(2,'0'),String(n).padStart(2,'0')].join('-');
  const dot=element('span','calendar-tile'+(st.days.has(date)?' has-activity':'')+(date===today()?' today':''),String(n));
  dot.setAttribute('aria-label',date+(st.days.has(date)?' z aktywnością':' bez aktywności'));
  container.append(dot);
 }
 box.append(container);
}
function open(view){
 const panel=$('#adventurePanel');if(!panel)return;
 const heading=$('#adventurePanelTitle');
 if(view==='surprise'){
  const list=ACTIVITIES.filter(([a])=>a!=='Inna aktywność').map(x=>x[0]);
  const random=list[Math.floor(Math.random()*list.length)];
  if(!random)return;
  window.AktywnikExperience?.setView?.('add');
  pickActivity(random);$('#entryCard')?.scrollIntoView({behavior:'smooth',block:'center'});
  if($('#adventureSurprise'))$('#adventureSurprise').textContent='Pomysł na dziś: '+random+'. Możesz wybrać także coś innego.';
  return;
 }
 if(!['badges','challenges','calendar'].includes(view))return;
 window.AktywnikExperience?.setView?.('add');
 panel.hidden=false;
 heading.textContent=view==='badges'?'🏆 Moje odznaki':view==='challenges'?'🏔️ Małe wyzwania':'📅 Kalendarz ruchu';
 for(const item of ['badges','challenges','calendar']){
  const el=$('#adventure'+item[0].toUpperCase()+item.slice(1));if(el)el.hidden=item!==view;
 }
 renderBadges();renderChallenges();renderCalendar();
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function refresh(){
 if(!appReady())return;
 renderBadges();renderChallenges();renderCalendar();
 const child=activeChild(),greeting=$('#playfulGreeting');
 if(child&&greeting)greeting.textContent='Cześć, '+child.displayName+'! 👋';
 const todayCount=availableEntries().filter(e=>e.date===today()).length;
 const active=$('#playfulTodayHint');if(active)active.textContent=todayCount?'Dzisiaj zapisano '+todayCount+' aktywności.':'Na jaki ruch masz dziś ochotę?';
}
function init(){
 renderActivities();renderModuleLinks();
 $('#adventureClose')?.addEventListener('click',()=>{$('#adventurePanel').hidden=true});
 const experience=window.AktywnikExperience;
 if(experience){
  const original=experience.refresh;
  experience.refresh=function(){original?.();refresh()};
 }
 refresh();
}
window.AktywnikPlayful={stats,open,renderBadges,renderChallenges,renderCalendar};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();