/* Layout/navigation only. Existing auth, roles, diary, OCR and data stay in app.js. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
let pendingSecure=null;
let selected='home';
let selectionBeforeGate='home';
function closeMenu(){document.body.classList.remove('shell-nav-open');$('#sidebarToggleBtn')?.setAttribute('aria-expanded','false')}
function render(){
 const ready=typeof appReady==='function'&&appReady();
 const family=typeof isSelfMode==='function'&&!isSelfMode();
 const panel=$('#sidebarNav');
 if(panel)panel.hidden=!ready;
 document.body.classList.toggle('shell-ready',ready);
 $$('#sidebarNav [data-nav-action]').forEach(btn=>{
  const action=btn.dataset.navAction;
  const on=(action===selected)||(selected==='home'&&action==='home');
  btn.classList.toggle('selected',on);btn.setAttribute('aria-current',on?'page':'false');
  btn.disabled=!ready;
  if(btn.dataset.navRole==='family')btn.hidden=!family;
 });
 if(pendingSecure&&typeof parentUnlocked==='function'&&parentUnlocked()&&currentMode==='parent'){
  const action=pendingSecure;pendingSecure=null;
  setTimeout(()=>open(action),0);
 }
 const count=$('#shellEntryCount');
 if(count&&ready){
  const child=activeChild();
  count.textContent=String(child?state.entries.filter(e=>e.childId===child.id).length:0);
 }
}
function inChild(view){
 if(!appReady())return;
 if(currentMode!=='child')switchMode('child',true);
 window.AktywnikExperience?.setView?.(view);
}
function open(action){
 if(!action)return;
 closeMenu();
 if(!appReady()){$('#pilotSetupCard')?.scrollIntoView({behavior:'smooth'});return}
 const oldSelection=selected;
 selected=action;
 if(pendingSecure&&pendingSecure!==action)pendingSecure=null;
 if(action==='data'&&!isSelfMode()){
  // Data import is a parent-only operation in family mode.
  if(!parentUnlocked()){
   selectionBeforeGate=oldSelection;
   pendingSecure='data';
   $('#parentAccessBtn')?.click();
   return;
  }
  switchMode('parent');
  window.AktywnikTableImport?.refreshVisibility?.();
  setTimeout(()=>$('#structuredImportCard')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
 }else if(['home','add','diary','stats','data'].includes(action)){
  inChild(action==='home'||action==='add'?'add':action);
  if(action==='add')setTimeout(()=>$('#playfulActivities')?.scrollIntoView({behavior:'smooth',block:'center'}),20);
  if(action==='data')setTimeout(()=>$('#structuredImportCard')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
 }else if(['challenges','badges','calendar'].includes(action)){
  inChild('add');window.AktywnikPlayful?.open?.(action);
 }else if(action==='class'){
  location.href='school-cloud.html';
 }else if(action==='parent'||action==='ocr'||action==='reports'){
  if(isSelfMode()){inChild('data');return}
  if(!parentUnlocked()){
   selectionBeforeGate=oldSelection;
   pendingSecure=action;
   document.querySelector('#parentAccessBtn')?.click();
   return;
  }
  if(action==='ocr'){
   switchMode('school');
   setTimeout(()=>$('#paperImportCard')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
  }else{
   switchMode('parent');
   if(action==='reports')setTimeout(()=>$('#parentReportCard')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
  }
 }else if(action==='teams'){
  inChild('add');
  const intro=$('#teamsIntroCard');
  if(intro){intro.hidden=false;intro.scrollIntoView({behavior:'smooth',block:'center'})}
 }else if(action==='settings'){
  inChild('data');
 }
 render();
}
function init(){
 const toggle=$('#sidebarToggleBtn');
 toggle?.addEventListener('click',()=>{
  const isOpen=!document.body.classList.contains('shell-nav-open');
  document.body.classList.toggle('shell-nav-open',isOpen);
  toggle.setAttribute('aria-expanded',String(isOpen));
 });
 $('#sidebarShade')?.addEventListener('click',closeMenu);
 $('#parentUnlockDialog')?.addEventListener('close',()=>{
  if(typeof parentUnlocked==='function'&&!parentUnlocked()&&pendingSecure){
   pendingSecure=null;
   selected=selectionBeforeGate;
   render();
  }
 });
 $$('#sidebarNav [data-nav-action]').forEach(btn=>btn.addEventListener('click',()=>open(btn.dataset.navAction)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
 const existing=window.AktywnikExperience;
 if(existing){
  const old=existing.setView;
  existing.setView=function(view){const result=old?.(view);if(['add','diary','stats','data'].includes(view)){selected=view==='add'?'home':view;render()}return result};
 }
 render();
}
window.AktywnikShell={open,refresh:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();