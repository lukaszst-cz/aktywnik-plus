const ACTIVITIES=[
['Spacer','🚶'],['Spacer z psem','🐕'],['Rower','🚲'],['Hulajnoga','🛴'],['Rolki','🛼'],['Deskorolka','🛹'],['Basen','🏊'],['Bieganie','🏃'],['Marsz','🥾'],['Piłka nożna','⚽'],['Koszykówka','🏀'],['Siatkówka','🏐'],['Tenis','🎾'],['Badminton','🏸'],['Tenis stołowy','🏓'],['Judo','🥋'],['Karate','🥋'],['Taniec','💃'],['Gimnastyka','🤸'],['Ćwiczenia w domu','🏠'],['SKS','🏫'],['Trening klubowy','🏅'],['Plac zabaw','🛝'],['Zabawa na podwórku','🌳'],['Trampolina','🤸'],['Wspinaczka','🧗'],['Park linowy','🌲'],['Wycieczka piesza','🥾'],['Góry','⛰️'],['Narty','⛷️'],['Snowboard','🏂'],['Łyżwy','⛸️'],['Kajak','🛶'],['Żagle','⛵'],['Frisbee','🥏'],['Rzutki / celność','🎯'],['Gra terenowa','🧭'],['Zabawy ruchowe','🎈'],['Rozciąganie','🧘'],['Inna aktywność','➕']
];
const KEY='aktywnik-plus-data-v1';
const MAX_BACKUP_BYTES=2*1024*1024;
const MAX_ENTRIES=5000;
const MAX_CLASSES=100;
const MAX_JOIN_REQUESTS=1000;
const PARENT_SESSION_KEY='aktywnik-plus-parent-unlocked-until';
const PARENT_PIN_FAIL_KEY='aktywnik-plus-parent-pin-fails';
const PARENT_PIN_LOCK_KEY='aktywnik-plus-parent-pin-lock-until';
const MAX_PIN_ATTEMPTS=5;
const PIN_LOCK_MS=30000;
const DEFAULT_FAVORITES=['Spacer','Rower','Hulajnoga','Basen','Piłka nożna'];
const PIN_ITERATIONS=120000;
const defaultState={schemaVersion:5,meta:{lastBackupAt:null,lastWriteAt:null},pilot:{started:false},parentAuth:{pinSalt:'',pinHash:'',iterations:PIN_ITERATIONS,autoLockMinutes:5},children:[],activeChildId:null,activeTimer:null,entries:[],approvalEvents:[],rewards:[],classes:[],joinRequests:[],paperImports:[],reminderHour:19,reminderMinute:30,school:{deploymentModel:'school_saas',mode:'hybrid',requireParentApproval:true,useEffort:true,usePluses:true,gradeRule:'manual',maxCountedMinutes:null}};
let state=load(); let selected=null; let editingEntryId=null; let reportType='month'; let currentMode='child'; let parentSelectedChildId=state.activeChildId||state.children[0]?.id||null; let pendingPaperImportRows=[]; let parentReportMonth=today().slice(0,7); let lastPersistOk=true;
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return safeBackupState(saved)}catch{return structuredClone(defaultState)}}
function persist(){
  state.meta={...(state.meta||{}),lastWriteAt:nowIso()};
  try{
    localStorage.setItem(KEY,JSON.stringify(state));
    lastPersistOk=true;
  }catch(err){
    lastPersistOk=false;
    console.error('Aktywnik+: local save failed',err);
  }
  renderAll();
}
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function fmtMin(m){const h=Math.floor(m/60),r=m%60;return h?`${h} h${r?` ${r} min`:''}`:`${r} min`}
function today(){const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function cleanText(v,max=160){return String(v??'').trim().slice(0,max)}
function clampInt(v,min,max,fallback){const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback}
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v??'')))return false;return !Number.isNaN(new Date(String(v)+'T12:00:00').getTime())}
function allowedActivityDate(v){return validDate(v)&&v<=today()}
function uuid(){return crypto.randomUUID()}
function nowIso(){return new Date().toISOString()}
function getChild(id){return state.children.find(c=>c.id===id)||null}
function activeChild(){return getChild(state.activeChildId)||state.children[0]||null}
function parentChild(){return getChild(parentSelectedChildId)||activeChild()}
function childEntries(childId){return state.entries.filter(e=>e.childId===childId)}
function childRewards(childId){return state.rewards.filter(r=>r.childId===childId)}
function approvalRequired(child){return child?.requireParentApproval!==false}
function safeIso(value){const d=new Date(value||'');return Number.isNaN(d.getTime())?null:d.toISOString()}
function weekBounds(ref=new Date()){
  const start=new Date(ref);const offset=(start.getDay()+6)%7;start.setDate(start.getDate()-offset);start.setHours(0,0,0,0);
  const end=new Date(start);end.setDate(end.getDate()+7);return {start,end};
}
function usableChildEntries(childId){
  const {start,end}=weekBounds();
  return childEntries(childId).filter(e=>e.status!=='rejected'&&validDate(e.date)&&new Date(e.date+'T12:00:00')<end);
}
function latestActivityEntry(childId){
  return childEntries(childId).filter(e=>e.status!=='rejected'&&validDate(e.date)).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0]||null;
}
function recentDuplicate(childId,payload){
  const cutoff=Date.now()-20000;
  return state.entries.some(e=>e.childId===childId&&e.source==='manual'&&e.date===payload.date&&e.activity===payload.activity&&Number(e.minutes)===Number(payload.minutes)&&String(e.note||'')===String(payload.note||'')&&new Date(e.createdAt||0).getTime()>=cutoff);
}
function pinConfigured(){return !!state.parentAuth?.pinHash&&!!state.parentAuth?.pinSalt}
function appReady(){return state.children.length>0&&pinConfigured()}
function bytesToB64(bytes){let out='';bytes.forEach(b=>out+=String.fromCharCode(b));return btoa(out)}
function b64ToBytes(value){const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function derivePin(pin,saltB64,iterations=PIN_ITERATIONS){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64ToBytes(saltB64),iterations},key,256);return bytesToB64(new Uint8Array(bits))}
async function setParentPin(pin){const salt=crypto.getRandomValues(new Uint8Array(16)),pinSalt=bytesToB64(salt),pinHash=await derivePin(pin,pinSalt,PIN_ITERATIONS);state.parentAuth={pinSalt,pinHash,iterations:PIN_ITERATIONS,autoLockMinutes:5}}
async function verifyParentPin(pin){if(!pinConfigured())return false;return await derivePin(pin,state.parentAuth.pinSalt,state.parentAuth.iterations||PIN_ITERATIONS)===state.parentAuth.pinHash}
function parentUnlocked(){return Number(sessionStorage.getItem(PARENT_SESSION_KEY)||0)>Date.now()}
function pinLockRemainingMs(){return Math.max(0,Number(sessionStorage.getItem(PARENT_PIN_LOCK_KEY)||0)-Date.now())}
function clearPinFailures(){sessionStorage.removeItem(PARENT_PIN_FAIL_KEY);sessionStorage.removeItem(PARENT_PIN_LOCK_KEY)}
function registerPinFailure(){
  const fails=clampInt(sessionStorage.getItem(PARENT_PIN_FAIL_KEY),0,MAX_PIN_ATTEMPTS,0)+1;
  if(fails>=MAX_PIN_ATTEMPTS){
    sessionStorage.removeItem(PARENT_PIN_FAIL_KEY);
    sessionStorage.setItem(PARENT_PIN_LOCK_KEY,String(Date.now()+PIN_LOCK_MS));
    return true;
  }
  sessionStorage.setItem(PARENT_PIN_FAIL_KEY,String(fails));
  return false;
}
function touchParentSession(){const mins=clampInt(state.parentAuth?.autoLockMinutes,1,30,5);sessionStorage.setItem(PARENT_SESSION_KEY,String(Date.now()+mins*60*1000))}
function addApprovalEvent(action,entry,actor,note='',before=null,after=null){state.approvalEvents=state.approvalEvents||[];state.approvalEvents.unshift({id:uuid(),entryId:entry?.id||'',childId:entry?.childId||parentChild()?.id||activeChild()?.id||'',action,actor,note:cleanText(note,240),before,after,at:nowIso()});state.approvalEvents=state.approvalEvents.slice(0,10000)}

function pickActivity(name){
  if(!activeChild())return;selected=name;editingEntryId=null;
  $('#selectedActivityTitle').textContent=name;$('#activityDate').value=today();$('#activityDuration').value='30';$('#activityEffort').value='2';$('#activityNote').value='';
  $('#saveEntryBtn').textContent='Zapisz ręcznie';$('#startTimerBtn').classList.remove('hidden');$('#entryCard').classList.remove('hidden');$('#entryCard').scrollIntoView({behavior:'smooth',block:'center'});
}
function activityButton([name,emoji]){const b=document.createElement('button');b.className='activity';b.innerHTML=`<span class="emoji">${emoji}</span>${name}`;b.onclick=()=>pickActivity(name);return b}
function renderActivities(){
  const child=activeChild();if(!child)return;
  const fav=$('#favoriteActivities');fav.innerHTML='';ACTIVITIES.filter(a=>(child.favorites||DEFAULT_FAVORITES).includes(a[0])).forEach(a=>fav.append(activityButton(a)));
  const q=$('#activitySearch').value.toLowerCase(),all=$('#allActivities');all.innerHTML='';ACTIVITIES.filter(a=>a[0].toLowerCase().includes(q)).forEach(a=>all.append(activityButton(a)));
}
function renderSaveStatus(){
  const el=$('#saveStatusBadge');if(!el)return;
  if(!lastPersistOk){el.textContent='błąd zapisu';el.dataset.state='error';return}
  const last=safeIso(state.meta?.lastWriteAt);
  el.textContent=last?'zapisano '+new Date(last).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}):'zapis lokalny';
  el.dataset.state='ok';
}
function renderChildOverview(){
  const child=activeChild(),box=$('#childWeekSnapshot'),repeat=$('#repeatLastActivityBtn');if(!child||!box||!repeat)return;
  const {start,end}=weekBounds(),week=usableChildEntries(child.id).filter(e=>{const d=new Date(e.date+'T12:00:00');return d>=start&&d<end});
  const minutes=week.reduce((sum,e)=>sum+Number(e.minutes||0),0),days=new Set(week.map(e=>e.date)).size,pending=childEntries(child.id).filter(e=>e.status==='pending').length,last=latestActivityEntry(child.id);
  box.innerHTML='<div class="snapshot-item"><strong>'+fmtMin(minutes)+'</strong><small>ruch w tym tygodniu</small></div><div class="snapshot-item"><strong>'+days+'</strong><small>aktywne dni</small></div><div class="snapshot-item"><strong>'+pending+'</strong><small>czeka na rodzica</small></div><div class="snapshot-item"><strong>'+(last?escapeHtml(last.activity):'—')+'</strong><small>'+(last?'ostatnio · '+escapeHtml(last.date):'brak wpisów')+'</small></div>';
  repeat.classList.toggle('hidden',!last);
}
function repeatLastActivity(){
  const child=activeChild(),last=child?latestActivityEntry(child.id):null;if(!last)return;
  pickActivity(last.activity);setQuickDuration(last.minutes);$('#activityEffort').value=String(clampInt(last.effort,1,5,2));$('#activityNote').value='';
}
function backupAgeLabel(){
  const iso=safeIso(state.meta?.lastBackupAt);if(!iso)return 'kopia: brak';
  const days=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/86400000));
  return days===0?'kopia: dziś':days===1?'kopia: wczoraj':'kopia: '+days+' dni temu';
}
function renderParentSnapshot(){
  const child=parentChild(),box=$('#parentSnapshot'),badge=$('#parentBackupBadge');if(!child||!box||!badge)return;
  const {start,end}=weekBounds(),approved=childEntries(child.id).filter(e=>e.status==='approved'&&validDate(e.date));
  const week=approved.filter(e=>{const d=new Date(e.date+'T12:00:00');return d>=start&&d<end}),todayMinutes=approved.filter(e=>e.date===today()).reduce((sum,e)=>sum+Number(e.minutes||0),0),weekMinutes=week.reduce((sum,e)=>sum+Number(e.minutes||0),0),pending=childEntries(child.id).filter(e=>e.status==='pending').length,last=approved.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0]||null;
  box.innerHTML='<div class="snapshot-item"><strong>'+fmtMin(todayMinutes)+'</strong><small>zatwierdzone dzisiaj</small></div><div class="snapshot-item"><strong>'+fmtMin(weekMinutes)+'</strong><small>zatwierdzone w tygodniu</small></div><div class="snapshot-item"><strong>'+pending+'</strong><small>do decyzji</small></div><div class="snapshot-item"><strong>'+(last?escapeHtml(last.activity):'—')+'</strong><small>'+(last?'ostatnio · '+escapeHtml(last.date):'brak zatwierdzonych')+'</small></div>';
  badge.textContent=backupAgeLabel();
  const backup=$('#backupStatus');if(backup)backup.textContent=backupAgeLabel().replace('kopia: ','');
}
function setQuickDuration(minutes){const input=$('#activityDuration');if(!input)return;input.value=String(minutes);$$('[data-duration]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.duration)===Number(minutes)))}

function startActivityTimer(){
  const child=activeChild();if(!selected||!child||state.activeTimer)return;
  if(editingEntryId){alert('Podczas poprawiania wpisu zapisz czas ręcznie.');return}
  const date=$('#activityDate').value||today();if(!allowedActivityDate(date)){alert('Data aktywności nie może być z przyszłości.');return}
  state.activeTimer={childId:child.id,activity:selected,startAt:nowIso(),date,effort:clampInt($('#activityEffort').value,1,5,2),note:cleanText($('#activityNote').value,120)};
  selected=null;$('#activityNote').value='';$('#entryCard').classList.add('hidden');persist();
}
function timerElapsedSeconds(){
  if(!state.activeTimer?.startAt)return 0;
  return Math.max(0,Math.floor((Date.now()-new Date(state.activeTimer.startAt).getTime())/1000));
}
function fmtClock(seconds){
  const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
  return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':');
}
function renderTimer(){
  const card=$('#timerStatusCard');if(!card)return;const active=state.activeTimer,visible=!!active&&active.childId===state.activeChildId;
  card.classList.toggle('hidden',!visible);if(!visible)return;
  $('#timerActivityName').textContent=active.activity;$('#timerElapsed').textContent=fmtClock(timerElapsedSeconds());$('#timerStartedAt').textContent='Start: '+new Date(active.startAt).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
}
function stopActivityTimer(){
  const t=state.activeTimer;if(!t)return;const child=getChild(t.childId);if(!child)return;
  const seconds=timerElapsedSeconds(),minutes=clampInt(Math.max(1,Math.round(seconds/60)),1,600,1);
  const entry={id:uuid(),childId:child.id,date:t.date||today(),activity:t.activity,minutes,effort:clampInt(t.effort,1,5,2),note:cleanText(t.note,120),status:approvalRequired(child)?'pending':'approved',source:'timer',startedAt:t.startAt,stoppedAt:nowIso(),measuredSeconds:seconds,createdAt:nowIso(),rejectionReason:''};
  state.entries.unshift(entry);addApprovalEvent('created',entry,'child','Wpis zapisany przez Start/Stop.');if(entry.status==='approved')addApprovalEvent('approved_auto',entry,'system','Automatyczne zatwierdzenie zgodnie z ustawieniem rodzica.');state.activeTimer=null;persist();
}
function cancelActivityTimer(){
  if(!state.activeTimer)return;
  if(confirm('Anulować trwający pomiar? Czas nie zostanie zapisany.')){
    state.activeTimer=null;
    persist();
  }
}
function editChildEntry(id){
  const child=activeChild(),e=state.entries.find(x=>x.id===id&&x.childId===child?.id);if(!e||!['pending','rejected'].includes(e.status))return;
  editingEntryId=e.id;selected=e.activity;$('#selectedActivityTitle').textContent=e.status==='rejected'?'Popraw odrzucony wpis':'Edytuj oczekujący wpis';
  $('#activityDate').value=e.date;$('#activityDuration').value=e.minutes;$('#activityEffort').value=e.effort;$('#activityNote').value=e.note||'';$('#saveEntryBtn').textContent=e.status==='rejected'?'Popraw i wyślij ponownie':'Zapisz poprawkę';$('#startTimerBtn').classList.add('hidden');$('#entryCard').classList.remove('hidden');$('#entryCard').scrollIntoView({behavior:'smooth',block:'center'});
}
function cancelEntry(){editingEntryId=null;selected=null;$('#entryCard').classList.add('hidden');$('#startTimerBtn').classList.remove('hidden');$('#saveEntryBtn').textContent='Zapisz ręcznie'}
function saveEntry(){
  const child=activeChild();if(!child)return;const minutes=Number($('#activityDuration').value),date=$('#activityDate').value||today();
  if(!selected||!Number.isFinite(minutes)||minutes<1||minutes>600){alert('Podaj czas od 1 do 600 minut.');return}
  if(!allowedActivityDate(date)){alert('Data aktywności nie może być z przyszłości.');return}
  const payload={date,activity:selected,minutes:Math.round(minutes),effort:clampInt($('#activityEffort').value,1,5,2),note:cleanText($('#activityNote').value,120)};
  if(editingEntryId){
    const e=state.entries.find(x=>x.id===editingEntryId&&x.childId===child.id);if(!e||!['pending','rejected'].includes(e.status)){cancelEntry();return}
    const before={date:e.date,activity:e.activity,minutes:e.minutes,effort:e.effort,note:e.note,status:e.status},wasRejected=e.status==='rejected';
    Object.assign(e,payload,{status:approvalRequired(child)?'pending':'approved',rejectionReason:'',updatedAt:nowIso()});
    addApprovalEvent(wasRejected?'resubmitted':'edited',e,'child',wasRejected?'Dziecko poprawiło odrzucony wpis i wysłało go ponownie.':'Dziecko poprawiło oczekujący wpis.',before,{date:e.date,activity:e.activity,minutes:e.minutes,effort:e.effort,note:e.note,status:e.status});
    if(e.status==='approved')addApprovalEvent('approved_auto',e,'system','Automatyczne zatwierdzenie po poprawce.');
  }else{
    if(recentDuplicate(child.id,payload)){alert('Ten sam wpis został zapisany przed chwilą. Sprawdź listę ostatnich wpisów.');return}
    const entry={id:uuid(),childId:child.id,...payload,status:approvalRequired(child)?'pending':'approved',source:'manual',createdAt:nowIso(),rejectionReason:''};
    state.entries.unshift(entry);addApprovalEvent('created',entry,'child','Wpis ręczny.');if(entry.status==='approved')addApprovalEvent('approved_auto',entry,'system','Automatyczne zatwierdzenie zgodnie z ustawieniem rodzica.');
  }
  cancelEntry();persist();
}
function statusLabel(e){
  if(e.status==='approved')return '✅ zatwierdzone';
  if(e.status==='rejected')return '↩️ do poprawy'+(e.rejectionReason?': '+e.rejectionReason:'');
  return '⏳ czeka na rodzica';
}
function renderChildEntries(){
  const child=activeChild(),box=$('#childEntries');box.innerHTML='';if(!child)return;
  const entries=childEntries(child.id).slice(0,20);
  entries.forEach(e=>{const el=document.createElement('div');el.className='entry';const canEdit=['pending','rejected'].includes(e.status);el.innerHTML='<div><strong>'+escapeHtml(e.activity)+' · '+fmtMin(e.minutes)+'</strong><small>'+escapeHtml(e.date)+' · wysiłek '+e.effort+'/5 · '+(e.source==='timer'?'⏱ Start/Stop':'✍️ wpis ręczny')+(e.note?' · '+escapeHtml(e.note):'')+'<br>'+escapeHtml(statusLabel(e))+'</small></div>'+(canEdit?'<div class="entry-actions"><button class="ghost" data-child-edit="'+escapeAttr(e.id)+'">'+(e.status==='rejected'?'Popraw i wyślij':'Edytuj')+'</button></div>':'');box.append(el)});
  if(!entries.length)box.innerHTML='<small>Jeszcze nie ma wpisów.</small>';$$('[data-child-edit]').forEach(b=>b.onclick=()=>editChildEntry(b.dataset.childEdit));
  const pending=childEntries(child.id).filter(e=>e.status==='pending').length;$('#pendingChildBadge').textContent=pending?pending+' do zatwierdzenia':'';$('#todayMinutes').textContent=childEntries(child.id).filter(e=>e.date===today()).reduce((sum,e)=>sum+e.minutes,0);
}
function renderChildRewards(){
  const child=activeChild(),box=$('#childRewardHistory');if(!box)return;box.innerHTML='';if(!child)return;
  const rewards=childRewards(child.id).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,20);
  rewards.forEach(r=>{const el=document.createElement('div');el.className='entry';el.innerHTML='<div><strong>'+(r.type==='plus'?'Plus':r.type==='grade'?'Ocena':'Informacja')+' · '+escapeHtml(r.value)+'</strong><small>'+escapeHtml(r.date)+(r.note?' · '+escapeHtml(r.note):'')+'</small></div>';box.append(el)});
  if(!rewards.length)box.innerHTML='<small>Brak zapisanych plusów i ocen.</small>';
}

function approve(id){
  if(!guardParent())return;const child=parentChild(),e=state.entries.find(x=>x.id===id&&x.childId===child?.id&&x.status==='pending');if(!e)return;
  const before={status:e.status};e.status='approved';e.rejectionReason='';e.approvedAt=nowIso();addApprovalEvent('approved',e,'parent','Rodzic zatwierdził wpis.',before,{status:e.status});persist();
}
function openParentCorrection(id){
  if(!guardParent())return;const child=parentChild(),e=state.entries.find(x=>x.id===id&&x.childId===child?.id&&x.status==='pending');if(!e)return;
  $('#parentEditEntryId').value=e.id;$('#parentEditDate').value=e.date;$('#parentEditMinutes').value=e.minutes;$('#parentEditEffort').value=e.effort;$('#parentEditNote').value=e.note||'';$('#parentEditDialog').showModal();
}
function saveParentCorrection(){
  if(!guardParent())return;const id=$('#parentEditEntryId').value,child=parentChild(),e=state.entries.find(x=>x.id===id&&x.childId===child?.id&&x.status==='pending');if(!e)return;
  const date=$('#parentEditDate').value,minutes=Number($('#parentEditMinutes').value);if(!allowedActivityDate(date)||!Number.isFinite(minutes)||minutes<1||minutes>600){alert('Sprawdź datę i czas (1–600 min).');return}
  const before={date:e.date,minutes:e.minutes,effort:e.effort,note:e.note,status:e.status};e.date=date;e.minutes=Math.round(minutes);e.effort=clampInt($('#parentEditEffort').value,1,5,2);e.note=cleanText($('#parentEditNote').value,120);e.status='approved';e.rejectionReason='';e.approvedAt=nowIso();e.correctedByParent=true;
  addApprovalEvent('corrected',e,'parent','Rodzic poprawił i zatwierdził wpis.',before,{date:e.date,minutes:e.minutes,effort:e.effort,note:e.note,status:e.status});$('#parentEditDialog').close();persist();
}
function openReject(id){
  if(!guardParent())return;const child=parentChild(),e=state.entries.find(x=>x.id===id&&x.childId===child?.id&&x.status==='pending');if(!e)return;
  $('#rejectEntryId').value=e.id;$('#rejectReason').value='Popraw czas';$('#rejectNote').value='';$('#rejectDialog').showModal();
}
function confirmReject(){
  if(!guardParent())return;const id=$('#rejectEntryId').value,child=parentChild(),e=state.entries.find(x=>x.id===id&&x.childId===child?.id&&x.status==='pending');if(!e)return;
  const reason=[cleanText($('#rejectReason').value,80),cleanText($('#rejectNote').value,120)].filter(Boolean).join(' — '),before={status:e.status};e.status='rejected';e.rejectionReason=reason||'Do poprawy';e.rejectedAt=nowIso();addApprovalEvent('rejected',e,'parent',e.rejectionReason,before,{status:e.status,rejectionReason:e.rejectionReason});$('#rejectDialog').close();persist();
}
function approveAllVisible(){
  if(!guardParent())return;const child=parentChild();if(!child)return;const pending=state.entries.filter(e=>e.childId===child.id&&e.status==='pending');if(!pending.length)return;
  if(!confirm('Zatwierdzić '+pending.length+' oczekujących wpisów profilu '+child.displayName+'?'))return;
  pending.forEach(e=>{const before={status:e.status};e.status='approved';e.rejectionReason='';e.approvedAt=nowIso();addApprovalEvent('approved',e,'parent','Zatwierdzenie zbiorcze.',before,{status:e.status})});persist();
}
function renderApprovals(){
  const list=$('#approvalList'),history=$('#approvalHistory');if(!parentUnlocked()||!parentChild()){$('#pendingCount').textContent='0';list.innerHTML='';history.innerHTML='';return}
  const child=parentChild(),pending=state.entries.filter(e=>e.childId===child.id&&e.status==='pending');$('#pendingCount').textContent=pending.length;list.innerHTML='';
  pending.forEach(e=>{const el=document.createElement('div');el.className='entry';el.innerHTML='<div><strong>'+escapeHtml(e.activity)+' · '+fmtMin(e.minutes)+'</strong><small>'+escapeHtml(e.date)+' · wysiłek '+e.effort+'/5 · '+(e.source==='timer'?'⏱ Start/Stop':'✍️ ręczny')+(e.note?' · '+escapeHtml(e.note):'')+'</small></div><div class="entry-actions"><button class="primary" data-approve="'+escapeAttr(e.id)+'">Zatwierdź</button><button class="ghost" data-correct="'+escapeAttr(e.id)+'">Popraw</button><button class="danger" data-reject="'+escapeAttr(e.id)+'">Odrzuć</button></div>';list.append(el)});
  if(!pending.length)list.innerHTML='<small>Brak wpisów oczekujących na decyzję.</small>';
  $$('[data-approve]').forEach(b=>b.onclick=()=>approve(b.dataset.approve));$$('[data-correct]').forEach(b=>b.onclick=()=>openParentCorrection(b.dataset.correct));$$('[data-reject]').forEach(b=>b.onclick=()=>openReject(b.dataset.reject));
  const n=new Date(),after=n.getHours()>state.reminderHour||(n.getHours()===state.reminderHour&&n.getMinutes()>=state.reminderMinute);$('#approvalReminder').classList.toggle('hidden',!(after&&pending.length));
  const labels={created:'Utworzono wpis',edited:'Dziecko poprawiło wpis',resubmitted:'Ponownie wysłano',approved:'Rodzic zatwierdził',approved_auto:'Zatwierdzono automatycznie',corrected:'Rodzic poprawił i zatwierdził',rejected:'Rodzic odrzucił'};history.innerHTML='';
  state.approvalEvents.filter(ev=>ev.childId===child.id).slice(0,30).forEach(ev=>{const entry=state.entries.find(e=>e.id===ev.entryId),el=document.createElement('div');el.className='entry';el.innerHTML='<div><strong>'+escapeHtml(labels[ev.action]||ev.action)+(entry?' · '+escapeHtml(entry.activity):'')+'</strong><small>'+new Date(ev.at).toLocaleString('pl-PL')+(ev.note?' · '+escapeHtml(ev.note):'')+'</small></div>';history.append(el)});
  if(!history.children.length)history.innerHTML='<small>Historia decyzji pojawi się po pierwszym wpisie.</small>';
}
function startFor(type,d=new Date()){const y=d.getFullYear(),m=d.getMonth();if(type==='month')return new Date(y,m,1);if(type==='quarter')return new Date(y,Math.floor(m/3)*3,1);if(type==='half')return new Date(y,m<6?0:6,1);return new Date(y,0,1)}
function endFor(type,d=new Date()){
  const start=startFor(type,d);
  if(type==='month')return new Date(start.getFullYear(),start.getMonth()+1,0,23,59,59);
  if(type==='quarter')return new Date(start.getFullYear(),start.getMonth()+3,0,23,59,59);
  if(type==='half')return new Date(start.getFullYear(),start.getMonth()+6,0,23,59,59);
  return new Date(start.getFullYear(),11,31,23,59,59);
}
function safeReferenceMonth(value){const v=String(value||'');return /^\d{4}-\d{2}$/.test(v)&&validDate(v+'-01')?v:today().slice(0,7)}
function parentReportReferenceDate(){
  parentReportMonth=safeReferenceMonth($('#parentReportMonth')?.value||parentReportMonth);
  return new Date(parentReportMonth+'-15T12:00:00');
}
function filtered(type,childId=state.activeChildId,referenceDate=new Date()){
  const start=startFor(type,referenceDate),periodEnd=endFor(type,referenceDate),todayEnd=new Date(today()+'T23:59:59'),end=periodEnd<todayEnd?periodEnd:todayEnd;
  return state.entries.filter(e=>e.childId===childId&&e.status==='approved'&&validDate(e.date)&&new Date(e.date+'T12:00:00')>=start&&new Date(e.date+'T12:00:00')<=end);
}
function stats(type,childId=state.activeChildId,referenceDate=new Date()){
  const es=filtered(type,childId,referenceDate),minutes=es.reduce((sum,e)=>sum+e.minutes,0),days=new Set(es.map(e=>e.date)).size,types=new Set(es.map(e=>e.activity)).size,counts={};
  es.forEach(e=>counts[e.activity]=(counts[e.activity]||0)+e.minutes);return {es,minutes,days,types,counts};
}
function renderStats(){
  const child=activeChild();if(!child)return;const st=stats($('#reportPeriod').value,child.id);
  $('#statsGrid').innerHTML='<div class="stat"><strong>'+fmtMin(st.minutes)+'</strong><small>łączny czas</small></div><div class="stat"><strong>'+st.days+'</strong><small>aktywne dni</small></div><div class="stat"><strong>'+st.es.length+'</strong><small>aktywności</small></div><div class="stat"><strong>'+st.types+'</strong><small>różne rodzaje</small></div>';
  const max=Math.max(1,...Object.values(st.counts));$('#activityBreakdown').innerHTML=Object.entries(st.counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>'<div class="bar-row"><span>'+escapeHtml(n)+'</span><div class="bar"><i style="width:'+Math.round(v/max*100)+'%"></i></div><strong>'+fmtMin(v)+'</strong></div>').join('')||'<small>Statystyki pojawią się po zatwierdzeniu aktywności.</small>';
}
function reportTitle(t){return ({month:'Raport miesięczny',quarter:'Raport kwartalny',half:'Raport półroczny',year:'Raport roczny'})[t]}
function csvCell(v){const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
function exportReportCsv(){
  if(!guardParent())return;const child=parentChild();if(!child)return;const reference=parentReportReferenceDate(),es=filtered(reportType,child.id,reference);
  const rows=[['Dziecko','Data','Aktywność','Minuty','Wysiłek','Źródło','Notatka'],...es.map(e=>[child.displayName,e.date,e.activity,e.minutes,e.effort,e.source==='timer'?'Start/Stop':'Ręczny',e.note||''])];
  const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='aktywnik-'+child.displayName.replace(/[^A-Za-z0-9_-]+/g,'-')+'-'+reportType+'-'+parentReportMonth+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function reportPeriodLabel(type,referenceDate){
  const start=startFor(type,referenceDate),end=endFor(type,referenceDate),fmt=d=>d.toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric'});
  return fmt(start)+' – '+fmt(end);
}
function renderParentReport(){
  const box=$('#parentReport');if(!box)return;if(!parentUnlocked()||!parentChild()){box.innerHTML='';return}
  const child=parentChild(),reference=parentReportReferenceDate(),st=stats(reportType,child.id,reference);
  box.innerHTML='<div class="report-head"><div><h3>'+reportTitle(reportType)+' — '+escapeHtml(child.displayName)+'</h3><small>'+escapeHtml(reportPeriodLabel(reportType,reference))+'</small></div><span>'+fmtMin(st.minutes)+'</span></div><div class="report-summary"><div><b>'+st.days+'</b><small>aktywne dni</small></div><div><b>'+st.es.length+'</b><small>wpisy</small></div><div><b>'+st.types+'</b><small>rodzaje</small></div></div><div class="list">'+(st.es.map(e=>'<div class="entry"><div><strong>'+escapeHtml(e.activity)+' · '+fmtMin(e.minutes)+'</strong><small>'+escapeHtml(e.date)+(e.note?' · '+escapeHtml(e.note):'')+'</small></div></div>').join('')||'<small>Brak zatwierdzonych wpisów w tym okresie.</small>')+'</div>';
}
function buildSchoolPrintPages(childId,referenceDate){
  const entries=filtered('month',childId,referenceDate).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  const totalPages=Math.max(2,Math.ceil(entries.length/35));
  return Array.from({length:totalPages},(_,pageIndex)=>{
    const offset=pageIndex*35,chunk=entries.slice(offset,offset+35);
    const rows=Array.from({length:35},(_,rowIndex)=>({lp:offset+rowIndex+1,entry:chunk[rowIndex]||null}));
    return {page:pageIndex+1,totalPages,rows};
  });
}
function renderSchoolPrintReport(){
  if(!guardParent())return false;const child=parentChild();if(!child)return false;const reference=parentReportReferenceDate(),pages=buildSchoolPrintPages(child.id,reference),st=stats('month',child.id,reference),monthLabel=reference.toLocaleDateString('pl-PL',{month:'long',year:'numeric'}),box=$('#schoolPrintReport');
  box.innerHTML=pages.map(p=>'<section class="school-print-page"><div class="school-print-head"><div><h1>Dziennik Dodatkowej Aktywności Fizycznej</h1><p>jeden wiersz = jedna aktywność</p></div><div><strong>Aktywnik+</strong><br><small>raport z zatwierdzonych wpisów</small></div></div><div class="school-print-meta"><div>Imię / profil: <strong>'+escapeHtml(child.displayName)+'</strong></div><div>Klasa: <span></span></div><div>Miesiąc: <strong>'+escapeHtml(monthLabel)+'</strong></div></div><table class="school-print-table"><thead><tr><th>LP.</th><th>Data</th><th>Rodzaj aktywności</th><th>Czas</th><th>Wysiłek 1–5</th><th>Podpis / uwagi opiekuna</th></tr></thead><tbody>'+p.rows.map(r=>{const e=r.entry;return '<tr><td>'+r.lp+'</td><td>'+(e?escapeHtml(e.date):'')+'</td><td>'+(e?escapeHtml(e.activity):'')+'</td><td>'+(e?escapeHtml(fmtMin(e.minutes)):'')+'</td><td>'+(e?escapeHtml(e.effort):'')+'</td><td>'+(e?escapeHtml(e.note||''):'')+'</td></tr>'}).join('')+'</tbody></table>'+(p.page===p.totalPages?'<div class="school-print-summary"><strong>Podsumowanie miesiąca:</strong> '+st.es.length+' wpisów · '+st.days+' aktywnych dni · '+escapeHtml(fmtMin(st.minutes))+'<div><strong>Uwagi rodzica:</strong><span></span></div><div><strong>Uwagi nauczyciela / wychowawcy:</strong><span></span></div><div><strong>Plus / ocena:</strong><span></span></div></div>':'')+'<div class="school-print-footer"><span>Strona '+p.page+'/'+p.totalPages+' · wpisy '+((p.page-1)*35+1)+'–'+(p.page*35)+'</span><span>Aktywnik+ · raport lokalny</span></div></section>').join('');
  return true;
}
function printSchoolMonthlyReport(){
  if(!renderSchoolPrintReport())return;document.body.classList.add('school-print-mode');requestAnimationFrame(()=>window.print());
}
function renderFavoritesEditor(){
  const child=activeChild();if(!child)return;const box=$('#favoritesEditor');box.innerHTML='';
  ACTIVITIES.forEach(([name,emoji])=>{const label=document.createElement('label');label.className='favorite-check';label.innerHTML='<input type="checkbox" '+(child.favorites.includes(name)?'checked':'')+'> <span>'+emoji+' '+escapeHtml(name)+'</span>';const input=label.querySelector('input');input.onchange=()=>{if(input.checked&&!child.favorites.includes(name))child.favorites.push(name);if(!input.checked)child.favorites=child.favorites.filter(x=>x!==name);persist()};box.append(label)});
}
function openParentGate(){
  if(!pinConfigured()){document.querySelector('#pilotSetupCard')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  $('#parentPinInput').value='';
  const error=$('#parentPinError'),wait=Math.ceil(pinLockRemainingMs()/1000);
  if(wait>0){error.textContent='Za dużo błędnych prób. Spróbuj ponownie za '+wait+' s.';error.classList.remove('hidden')}
  else{error.textContent='Nieprawidłowy PIN.';error.classList.add('hidden')}
  $('#parentUnlockDialog').showModal();setTimeout(()=>$('#parentPinInput').focus(),20);
}
async function unlockParent(){
  const error=$('#parentPinError'),wait=Math.ceil(pinLockRemainingMs()/1000);
  if(wait>0){error.textContent='Za dużo błędnych prób. Spróbuj ponownie za '+wait+' s.';error.classList.remove('hidden');return}
  const ok=await verifyParentPin($('#parentPinInput').value);
  if(!ok){
    const locked=registerPinFailure();
    const seconds=Math.ceil(pinLockRemainingMs()/1000);
    error.textContent=locked?'Za dużo błędnych prób. Spróbuj ponownie za '+seconds+' s.':'Nieprawidłowy PIN.';
    error.classList.remove('hidden');return;
  }
  clearPinFailures();error.textContent='Nieprawidłowy PIN.';error.classList.add('hidden');
  touchParentSession();$('#parentUnlockDialog').close();parentSelectedChildId=getChild(parentSelectedChildId)?.id||state.activeChildId;switchMode('parent',true);
}
function lockParent(){sessionStorage.removeItem(PARENT_SESSION_KEY);currentMode='child';switchMode('child',true)}
function guardParent(){if(!parentUnlocked()){openParentGate();return false}touchParentSession();return true}
function switchMode(mode,bypass=false){
  if((mode==='parent'||mode==='school')&&!bypass&&!guardParent())return;
  if((mode==='parent'||mode==='school')&&!parentUnlocked())mode='child';
  currentMode=mode;
  const ready=appReady();
  $('#childPanel').classList.toggle('hidden',!ready||mode!=='child');
  $('#parentPanel').classList.toggle('hidden',!ready||mode!=='parent');
  $('#schoolPanel').classList.toggle('hidden',!ready||mode!=='school');
  if(mode==='parent'||mode==='school')touchParentSession();
  renderAll();
}
function renderParentChildren(){
  const select=$('#parentChildSelect');if(!select)return;if(!parentUnlocked()){select.innerHTML='';return}
  if(!getChild(parentSelectedChildId))parentSelectedChildId=state.activeChildId||state.children[0]?.id||null;
  select.innerHTML=state.children.map(c=>'<option value="'+escapeAttr(c.id)+'" '+(c.id===parentSelectedChildId?'selected':'')+'>'+escapeHtml(c.displayName)+(c.id===state.activeChildId?' — profil urządzenia':'')+'</option>').join('');
  const child=parentChild();$('#childApprovalMode').value=approvalRequired(child)?'required':'automatic';$('#joinChildName').value=child?.displayName||'';$('#parentAutoLockMinutes').value=String(clampInt(state.parentAuth?.autoLockMinutes,1,15,5));renderRewardChildSelect();
}
function addChild(){
  if(!guardParent())return;const name=cleanText($('#newChildName').value,60);if(!name)return;
  const child={id:uuid(),displayName:name,favorites:[...DEFAULT_FAVORITES],requireParentApproval:true,createdAt:nowIso()};state.children.push(child);parentSelectedChildId=child.id;$('#newChildName').value='';persist();
}
function renameChild(){
  if(!guardParent())return;const child=parentChild();if(!child)return;const name=cleanText(prompt('Nowa nazwa profilu dziecka:',child.displayName),60);if(!name)return;child.displayName=name;persist();
}
function setDeviceChild(){
  if(!guardParent())return;const child=parentChild();if(!child)return;
  if(state.activeTimer&&state.activeTimer.childId!==child.id){alert('Najpierw zakończ trwający pomiar aktywności na obecnym profilu.');return}
  state.activeChildId=child.id;persist();
}
function purgeChildLocalData(childId,target=state){
  target.entries=(target.entries||[]).filter(e=>e.childId!==childId);
  target.rewards=(target.rewards||[]).filter(r=>r.childId!==childId);
  target.approvalEvents=(target.approvalEvents||[]).filter(ev=>ev.childId!==childId);
  target.joinRequests=(target.joinRequests||[]).filter(r=>r.childId!==childId);
  target.paperImports=(target.paperImports||[]).filter(x=>x.familyChildId!==childId);
  (target.classes||[]).forEach(klass=>{
    klass.children=(klass.children||[]).filter(c=>c.familyChildId!==childId);
  });
  if(target.activeTimer?.childId===childId)target.activeTimer=null;
}
function removeChild(){
  if(!guardParent())return;const child=parentChild();if(!child)return;if(state.children.length<=1){alert('Musi pozostać co najmniej jeden profil dziecka.');return}
  if(!confirm('Usunąć profil '+child.displayName+' oraz wszystkie jego lokalne powiązania?'))return;
  purgeChildLocalData(child.id);
  state.children=state.children.filter(c=>c.id!==child.id);
  if(state.activeChildId===child.id)state.activeChildId=state.children[0].id;
  parentSelectedChildId=state.activeChildId;persist();
}
function saveApprovalMode(){if(!guardParent())return;const child=parentChild();if(!child)return;child.requireParentApproval=$('#childApprovalMode').value==='required';persist()}
function saveAutoLockSetting(){
  if(!guardParent())return;
  state.parentAuth.autoLockMinutes=clampInt($('#parentAutoLockMinutes').value,1,15,5);
  touchParentSession();
  persist();
}
async function changeParentPin(){
  if(!guardParent())return;
  const current=$('#currentParentPin').value,newPin=$('#newParentPin').value,confirmPin=$('#confirmNewParentPin').value;
  if(!await verifyParentPin(current)){alert('Obecny PIN jest nieprawidłowy.');return}
  if(!/^\d{4,8}$/.test(newPin)){alert('Nowy PIN musi mieć 4–8 cyfr.');return}
  if(newPin!==confirmPin){alert('Nowe PIN-y nie są takie same.');return}
  await setParentPin(newPin);
  $('#currentParentPin').value='';$('#newParentPin').value='';$('#confirmNewParentPin').value='';
  touchParentSession();
  persist();
  alert('PIN rodzica został zmieniony.');
}
function renderRewardChildSelect(){
  const sel=$('#rewardChildId');if(!sel)return;const previous=sel.value;sel.innerHTML=state.children.map(c=>'<option value="'+escapeAttr(c.id)+'">'+escapeHtml(c.displayName)+'</option>').join('');
  if(getChild(previous))sel.value=previous;else if(parentChild())sel.value=parentChild().id;
}

function renderSchoolSettings(){
  if(!parentUnlocked())return;
  const c=state.school||defaultState.school;$('#deploymentModel').value=c.deploymentModel||'school_saas';$('#schoolMode').value=c.mode;$('#requireParentApproval').value=c.requireParentApproval?'yes':'no';$('#useEffort').value=c.useEffort?'yes':'no';$('#usePluses').value=c.usePluses?'yes':'no';$('#gradeRule').value=c.gradeRule||'manual';$('#maxCountedMinutes').value=c.maxCountedMinutes??'';$('#rewardDate').value=$('#rewardDate').value||today();
  renderRewardChildSelect();const childId=$('#rewardChildId').value||parentChild()?.id||state.activeChildId,box=$('#rewardHistory');box.innerHTML='';
  childRewards(childId).sort((a,b)=>String(b.date).localeCompare(String(a.date))).forEach(r=>{const el=document.createElement('div');el.className='entry';el.innerHTML='<div><strong>'+(r.type==='plus'?'Plus':r.type==='grade'?'Ocena':'Informacja')+' · '+escapeHtml(r.value)+'</strong><small>'+escapeHtml(r.date)+(r.note?' · '+escapeHtml(r.note):'')+'</small></div>';box.append(el)});
  if(!box.children.length)box.innerHTML='<small>Brak zapisanych plusów i ocen.</small>';
}
function saveSchoolSettings(){
  if(!guardParent())return;state.school={deploymentModel:$('#deploymentModel').value,mode:$('#schoolMode').value,requireParentApproval:$('#requireParentApproval').value==='yes',useEffort:$('#useEffort').value==='yes',usePluses:$('#usePluses').value==='yes',gradeRule:$('#gradeRule').value,maxCountedMinutes:$('#maxCountedMinutes').value?clampInt($('#maxCountedMinutes').value,0,600,null):null};persist();
}
function saveReward(){
  if(!guardParent())return;const value=cleanText($('#rewardValue').value,20),childId=$('#rewardChildId').value;if(!value||!getChild(childId))return;
  state.rewards.unshift({id:uuid(),childId,type:$('#rewardType').value,value,date:validDate($('#rewardDate').value)?$('#rewardDate').value:today(),note:cleanText($('#rewardNote').value,160),createdAt:nowIso()});$('#rewardValue').value='';$('#rewardNote').value='';persist();
}
function makeClassCode(name){const base=(name||'KL').replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase()||'KL';return base+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function createClass(){
  if(!guardParent())return;const name=cleanText($('#newClassName').value,40),schoolYear=cleanText($('#newSchoolYear').value,12);if(!name)return;
  state.classes=state.classes||[];if(state.classes.length>=MAX_CLASSES){alert('Osiągnięto limit klas w lokalnym pilocie.');return}
  state.classes.unshift({id:uuid(),name,schoolYear:schoolYear||'2026/2027',code:makeClassCode(name),archived:false,children:[],createdAt:nowIso()});$('#newClassName').value='';persist();
}
function sendJoinRequest(){
  if(!guardParent())return;const child=parentChild(),code=cleanText($('#joinClassCode').value,12).toUpperCase(),mode=['digital','hybrid','paper'].includes($('#joinMode').value)?$('#joinMode').value:'digital',klass=state.classes.find(c=>!c.archived&&String(c.code||'').toUpperCase()===code);
  if(!child||!klass){$('#joinRequestStatus').innerHTML='<p class="status-pending">Sprawdź kod klasy.</p>';return}
  if(state.joinRequests.length>=MAX_JOIN_REQUESTS){$('#joinRequestStatus').innerHTML='<p class="status-pending">Osiągnięto limit zgłoszeń lokalnego pilota.</p>';return}
  const duplicate=state.joinRequests.some(r=>r.classId===klass.id&&r.childId===child.id&&r.status==='pending');if(duplicate){$('#joinRequestStatus').innerHTML='<p class="status-pending">To zgłoszenie już czeka na nauczyciela.</p>';return}
  state.joinRequests.unshift({id:uuid(),classId:klass.id,childId:child.id,childName:child.displayName,mode,status:'pending',createdAt:nowIso()});persist();$('#joinRequestStatus').innerHTML='<p class="status-approved">Zgłoszenie wysłane. Czeka na akceptację nauczyciela.</p>';
}
function acceptJoinRequest(id){
  if(!guardParent())return;const req=state.joinRequests.find(r=>r.id===id);if(!req)return;const klass=state.classes.find(c=>c.id===req.classId);if(!klass)return;
  klass.children=klass.children||[];if(!klass.children.some(c=>c.familyChildId===req.childId||(c.name||'').toLowerCase()===req.childName.toLowerCase()))klass.children.push({id:uuid(),familyChildId:req.childId||null,name:req.childName,mode:req.mode,reportStatus:'missing',joinedAt:nowIso()});req.status='accepted';persist();
}
function rejectJoinRequest(id){if(!guardParent())return;const req=state.joinRequests.find(r=>r.id===id);if(req){req.status='rejected';persist()}}
function addPaperChild(){
  if(!guardParent())return;const classId=$('#paperClassId').value,name=cleanText($('#paperChildName').value,60),klass=state.classes.find(c=>c.id===classId);if(!klass||!name)return;
  klass.children=klass.children||[];if(klass.children.some(c=>String(c.name||'').toLowerCase()===name.toLowerCase())){alert('To dziecko jest już na liście tej klasy.');return}
  klass.children.push({id:uuid(),familyChildId:null,name,mode:'paper',reportStatus:'missing',joinedAt:nowIso()});$('#paperChildName').value='';persist();
}
function setReportStatus(classId,childId,status){
  if(!guardParent())return;const klass=state.classes.find(c=>c.id===classId),child=klass?.children?.find(c=>c.id===childId);if(child&&['missing','preparing','submitted','reviewed'].includes(status)){child.reportStatus=status;persist()}
}
function renderClasses(){
  const classes=state.classes.filter(c=>!c.archived),box=$('#classList');if(!box)return;if(!parentUnlocked()){box.innerHTML='';return}box.innerHTML='';
  classes.forEach(c=>{const children=c.children||[],el=document.createElement('div');el.className='entry',childRows=children.map(ch=>'<div class="class-child"><span><strong>'+escapeHtml(ch.name)+'</strong> · '+(ch.mode==='paper'?'papier':ch.mode==='hybrid'?'hybrydowo':'cyfrowo')+'</span><select data-report-class="'+escapeAttr(c.id)+'" data-report-child="'+escapeAttr(ch.id)+'"><option value="missing" '+(ch.reportStatus==='missing'?'selected':'')+'>brak raportu</option><option value="preparing" '+(ch.reportStatus==='preparing'?'selected':'')+'>w przygotowaniu</option><option value="submitted" '+(ch.reportStatus==='submitted'?'selected':'')+'>oddany</option><option value="reviewed" '+(ch.reportStatus==='reviewed'?'selected':'')+'>sprawdzony</option></select></div>').join('');el.innerHTML='<div style="width:100%"><strong>'+escapeHtml(c.name)+'</strong><small>'+escapeHtml(c.schoolYear)+' · kod klasy: <b>'+escapeHtml(c.code)+'</b> · '+children.length+' dzieci</small>'+(childRows?'<div class="class-children">'+childRows+'</div>':'<small>Brak dzieci w klasie.</small>')+'</div>';box.append(el)});
  if(!classes.length)box.innerHTML='<small>Nie utworzono jeszcze żadnej klasy.</small>';const options=classes.map(c=>'<option value="'+escapeAttr(c.id)+'">'+escapeHtml(c.name)+' — '+escapeHtml(c.schoolYear)+'</option>').join('');const select=$('#paperClassId');if(select)select.innerHTML=options;const importSelect=$('#importClassId');if(importSelect)importSelect.innerHTML=options;$$('[data-report-child]').forEach(sel=>sel.onchange=()=>setReportStatus(sel.dataset.reportClass,sel.dataset.reportChild,sel.value));
}
function renderJoinRequests(){
  const box=$('#classJoinRequests');if(!box)return;if(!parentUnlocked()){box.innerHTML='';return}
  const pending=state.joinRequests.filter(r=>r.status==='pending');$('#classRequestBadge').textContent=pending.length?pending.length+' oczekuje':'';box.innerHTML='';
  pending.forEach(r=>{const klass=state.classes.find(c=>c.id===r.classId),el=document.createElement('div');el.className='entry';el.innerHTML='<div><strong>'+escapeHtml(r.childName)+'</strong><small>'+escapeHtml(klass?.name||'Klasa')+' · '+(r.mode==='paper'?'papier':r.mode==='hybrid'?'hybrydowo':'cyfrowo')+'</small></div><div class="entry-actions"><button class="primary" data-join-accept="'+escapeAttr(r.id)+'">Akceptuj</button><button class="ghost" data-join-reject="'+escapeAttr(r.id)+'">Odrzuć</button></div>';box.append(el)});
  if(!pending.length)box.innerHTML='<small>Brak oczekujących zgłoszeń.</small>';$$('[data-join-accept]').forEach(b=>b.onclick=()=>acceptJoinRequest(b.dataset.joinAccept));$$('[data-join-reject]').forEach(b=>b.onclick=()=>rejectJoinRequest(b.dataset.joinReject));
}

function parseDurationValue(value){
  const raw=cleanText(value,40).toLowerCase().replace(',', '.');if(!raw)return 0;
  const hhmm=raw.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);if(hhmm)return clampInt(Number(hhmm[1])*60+Number(hhmm[2]),1,600,0);
  const h=raw.match(/(\d+(?:\.\d+)?)\s*h/),m=raw.match(/(\d+)\s*min/);
  if(h||m)return clampInt((h?Number(h[1])*60:0)+(m?Number(m[1]):0),1,600,0);
  return clampInt(raw.replace(/[^0-9.]/g,''),1,600,0);
}
function normalizeImportRow(row){
  if(Array.isArray(row))row={date:row[0],activity:row[1],minutes:row[2],effort:row[3],note:row[4]};
  if(!row||typeof row!=='object')return null;const map={};Object.entries(row).forEach(([k,v])=>map[String(k).toLowerCase().trim()]=v);
  const date=cleanText(map.date??map.data??map['data aktywności'],20),activity=cleanText(map.activity??map.aktywnosc??map['aktywność']??map['rodzaj aktywności']??map.rodzaj,80),minutes=parseDurationValue(map.minutes??map.minuty??map.czas??map['czas trwania']),effort=clampInt(map.effort??map.wysilek??map['wysiłek']??map['poziom zmęczenia'],1,5,2),note=cleanText(map.note??map.uwagi??map['uwaga']??map['podpis / uwagi opiekuna'],160);
  if(!allowedActivityDate(date)||!activity||!minutes)return null;return {date,activity,minutes,effort,note};
}
function parseDelimitedImport(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return [];
  const first=lines[0],delimiter=first.includes(';')?';':first.includes('\t')?'\t':first.includes('|')?'|':',',split=line=>line.split(delimiter).map(x=>x.trim().replace(/^"|"$/g,''));
  let start=0,headers=null;const firstCols=split(lines[0]);if(firstCols.some(x=>/data|aktywn|czas|minutes|activity/i.test(x))){headers=firstCols.map(x=>x.toLowerCase().trim());start=1}
  return lines.slice(start).map(line=>{const cols=split(line);if(headers){const o={};headers.forEach((h,i)=>o[h]=cols[i]??'');return normalizeImportRow(o)}return normalizeImportRow(cols)}).filter(Boolean);
}
function parseImportText(text){
  const raw=String(text||'').trim();if(!raw)return [];if(raw.startsWith('{')||raw.startsWith('[')){try{const parsed=JSON.parse(raw),rows=Array.isArray(parsed)?parsed:(Array.isArray(parsed.rows)?parsed.rows:[]);return rows.map(normalizeImportRow).filter(Boolean)}catch{}}
  return parseDelimitedImport(raw);
}
async function loadPaperImportFile(file){
  if(!guardParent()||!file)return;try{$('#ocrPaste').value=await file.text();$('#paperImportStatus').innerHTML='<p class="status-approved">Plik wczytany. Sprawdź podgląd przed zapisem.</p>'}catch{$('#paperImportStatus').innerHTML='<p class="status-pending">Nie udało się odczytać pliku.</p>'}
}
function renderPaperImportPreview(){
  if(!guardParent())return;pendingPaperImportRows=parseImportText($('#ocrPaste').value);const box=$('#paperImportPreview');
  if(!pendingPaperImportRows.length){box.innerHTML='<p class="status-pending">Nie znaleziono poprawnych wierszy. Użyj CSV/JSON lub formatu: data; aktywność; czas; wysiłek; uwagi.</p>';$('#savePaperImportBtn').disabled=true;return}
  box.innerHTML='<div class="import-table"><div class="import-head">Data</div><div class="import-head">Aktywność</div><div class="import-head">Min</div><div class="import-head">Wysiłek</div><div class="import-head">Uwagi</div>'+pendingPaperImportRows.map((r,i)=>'<input data-import-field="date" data-import-row="'+i+'" value="'+escapeAttr(r.date)+'"><input data-import-field="activity" data-import-row="'+i+'" value="'+escapeAttr(r.activity)+'"><input data-import-field="minutes" data-import-row="'+i+'" type="number" min="1" max="600" value="'+r.minutes+'"><input data-import-field="effort" data-import-row="'+i+'" type="number" min="1" max="5" value="'+r.effort+'"><input data-import-field="note" data-import-row="'+i+'" value="'+escapeAttr(r.note)+'">').join('')+'</div>';
  $('#savePaperImportBtn').disabled=false;$('#paperImportStatus').innerHTML='<p class="status-approved">Rozpoznano '+pendingPaperImportRows.length+' wierszy. Możesz je poprawić przed zapisem.</p>';
}
function collectPaperImportPreview(){
  return pendingPaperImportRows.map((r,i)=>{const get=f=>document.querySelector('[data-import-row="'+i+'"][data-import-field="'+f+'"]')?.value??'';return normalizeImportRow({date:get('date'),activity:get('activity'),minutes:get('minutes'),effort:get('effort'),note:get('note')})}).filter(Boolean);
}
function savePaperImport(){
  if(!guardParent())return;const rows=collectPaperImportPreview(),childName=cleanText($('#importChildName').value,60),classId=$('#importClassId').value;
  if(!rows.length||!childName){$('#paperImportStatus').innerHTML='<p class="status-pending">Podaj dziecko i co najmniej jeden poprawny wiersz.</p>';return}
  const klass=state.classes.find(c=>c.id===classId);let familyChildId=null;
  if(klass){
    klass.children=klass.children||[];
    let child=klass.children.find(c=>String(c.name||'').toLowerCase()===childName.toLowerCase());
    if(!child){child={id:uuid(),familyChildId:null,name:childName,mode:'paper',reportStatus:'submitted',joinedAt:nowIso()};klass.children.push(child)}
    else child.reportStatus='submitted';
    familyChildId=child.familyChildId||null;
  }
  state.paperImports=state.paperImports||[];
  state.paperImports.unshift({id:uuid(),classId,childName,familyChildId,rows,source:'paper_ocr',createdAt:nowIso()});
  pendingPaperImportRows=[];$('#ocrPaste').value='';$('#paperImportFile').value='';$('#savePaperImportBtn').disabled=true;persist();$('#paperImportStatus').innerHTML='<p class="status-approved">Karta zapisana lokalnie i oznaczona jako oddana.</p>';
}
function renderPaperImports(){
  const box=$('#paperImportHistory');if(!box)return;if(!parentUnlocked()){box.innerHTML='';return}const imports=state.paperImports||[];
  box.innerHTML=imports.slice(0,20).map(x=>{const klass=state.classes.find(c=>c.id===x.classId),total=(x.rows||[]).reduce((sum,r)=>sum+Number(r.minutes||0),0);return '<div class="entry"><div><strong>'+escapeHtml(x.childName)+' · '+(x.rows||[]).length+' wpisów</strong><small>'+escapeHtml(klass?.name||'bez klasy')+' · '+fmtMin(total)+' · import OCR/DocPilot</small></div></div>'}).join('')||'<small>Nie zaimportowano jeszcze żadnej karty papierowej.</small>';
}

async function startPilot(){
  const name=cleanText($('#pilotChildName').value,60),pin=$('#parentPinSetup').value,confirmPin=$('#parentPinConfirm').value;
  if(!name){alert('Podaj nazwę dziecka.');return}
  if(!/^\d{4,8}$/.test(pin)){alert('PIN rodzica musi mieć 4–8 cyfr.');return}
  if(pin!==confirmPin){alert('PIN-y nie są takie same.');return}
  if(!state.children.length){
    const child={id:uuid(),displayName:name,favorites:[...DEFAULT_FAVORITES],requireParentApproval:true,createdAt:nowIso()};
    state.children=[child];state.activeChildId=child.id;parentSelectedChildId=child.id;state.pilot={started:true};
  }else{
    state.children[0].displayName=name;state.activeChildId=state.activeChildId||state.children[0].id;parentSelectedChildId=state.activeChildId;
  }
  await setParentPin(pin);$('#parentPinSetup').value='';$('#parentPinConfirm').value='';persist();switchMode('child',true);
}
function renderPilot(){
  const ready=appReady(),card=$('#pilotSetupCard');card.classList.toggle('hidden',ready);
  if(!ready&&state.children[0])$('#pilotChildName').value=$('#pilotChildName').value||state.children[0].displayName;
  const child=activeChild();
  $('#childDisplayName').textContent=child?'· '+child.displayName:'';
  $('#deviceChildBadge').textContent=child?'Profil: '+child.displayName:'Brak profilu';
  $('#parentAccessBtn').disabled=!ready;
  $('#childPanel').classList.toggle('hidden',!ready||currentMode!=='child');
  if(!ready){$('#parentPanel').classList.add('hidden');$('#schoolPanel').classList.add('hidden')}
}
function safeBackupState(raw){
  const base=structuredClone(defaultState);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Nieprawidłowy plik kopii.');
  const d=raw.data&&typeof raw.data==='object'&&!Array.isArray(raw.data)?raw.data:raw;
  const allowed=new Set(ACTIVITIES.map(a=>a[0]));
  let children=(Array.isArray(d.children)?d.children:[]).map(c=>{
    if(!c||typeof c!=='object')return null;
    const displayName=cleanText(c.displayName||c.name,60);if(!displayName)return null;
    const favorites=(Array.isArray(c.favorites)?c.favorites:DEFAULT_FAVORITES).map(x=>cleanText(x,80)).filter(x=>allowed.has(x)).slice(0,20);
    return {id:cleanText(c.id,80)||uuid(),displayName,favorites:favorites.length?favorites:[...DEFAULT_FAVORITES],requireParentApproval:c.requireParentApproval!==false,createdAt:c.createdAt||nowIso()};
  }).filter(Boolean).slice(0,50);
  if(!children.length&&(d.pilot?.started||cleanText(d.pilot?.childDisplayName,60)||(Array.isArray(d.entries)&&d.entries.length))){
    children=[{id:uuid(),displayName:cleanText(d.pilot?.childDisplayName,60)||'Profil dziecka',favorites:(Array.isArray(d.favorites)?d.favorites:DEFAULT_FAVORITES).map(x=>cleanText(x,80)).filter(x=>allowed.has(x)).slice(0,20),requireParentApproval:true,createdAt:nowIso()}];
  }
  const ids=new Set(children.map(c=>c.id)),fallback=children[0]?.id||null,activeChildId=ids.has(d.activeChildId)?d.activeChildId:fallback;
  const entries=(Array.isArray(d.entries)?d.entries:[]).slice(0,MAX_ENTRIES).map(e=>{
    if(!e||typeof e!=='object'||!validDate(e.date)||!cleanText(e.activity,80))return null;
    const minutes=clampInt(e.minutes,1,600,0),childId=ids.has(e.childId)?e.childId:fallback;if(!minutes||!childId)return null;
    return {...e,id:cleanText(e.id,80)||uuid(),childId,date:e.date,activity:cleanText(e.activity,80),minutes,effort:clampInt(e.effort,1,5,2),note:cleanText(e.note,120),status:['pending','approved','rejected'].includes(e.status)?e.status:'pending',source:['manual','timer'].includes(e.source)?e.source:'manual',rejectionReason:cleanText(e.rejectionReason,160),createdAt:e.createdAt||nowIso()};
  }).filter(Boolean);
  const approvalEvents=(Array.isArray(d.approvalEvents)?d.approvalEvents:[]).slice(0,10000).map(ev=>{
    if(!ev||typeof ev!=='object')return null;const childId=ids.has(ev.childId)?ev.childId:fallback;if(!childId)return null;
    return {id:cleanText(ev.id,80)||uuid(),entryId:cleanText(ev.entryId,80),childId,action:['created','edited','resubmitted','approved','approved_auto','corrected','rejected'].includes(ev.action)?ev.action:'edited',actor:['child','parent','system'].includes(ev.actor)?ev.actor:'system',note:cleanText(ev.note,240),at:ev.at||nowIso(),before:ev.before&&typeof ev.before==='object'?ev.before:null,after:ev.after&&typeof ev.after==='object'?ev.after:null};
  }).filter(Boolean);
  const rewards=(Array.isArray(d.rewards)?d.rewards:[]).slice(0,2000).map(r=>{if(!r||typeof r!=='object')return null;const childId=ids.has(r.childId)?r.childId:fallback;if(!childId)return null;return {...r,id:cleanText(r.id,80)||uuid(),childId,type:['plus','grade','note'].includes(r.type)?r.type:'plus',value:cleanText(r.value,20),date:validDate(r.date)?r.date:today(),note:cleanText(r.note,160),createdAt:r.createdAt||nowIso()}}).filter(Boolean);
  const classes=(Array.isArray(d.classes)?d.classes:[]).slice(0,MAX_CLASSES);
  const paperImports=(Array.isArray(d.paperImports)?d.paperImports:[]).slice(0,500).map(x=>x&&typeof x==='object'?{...x,id:cleanText(x.id,80)||uuid(),classId:cleanText(x.classId,80),childName:cleanText(x.childName,60),rows:Array.isArray(x.rows)?x.rows.slice(0,200):[],source:'paper_ocr',createdAt:x.createdAt||nowIso()}:null).filter(Boolean);
  const joinRequests=(Array.isArray(d.joinRequests)?d.joinRequests:[]).slice(0,MAX_JOIN_REQUESTS).map(r=>r&&typeof r==='object'?{...r,childId:ids.has(r.childId)?r.childId:null,childName:cleanText(r.childName,60),status:['pending','accepted','rejected'].includes(r.status)?r.status:'pending'}:null).filter(Boolean);
  let activeTimer=null;
  if(d.activeTimer&&typeof d.activeTimer==='object'){const childId=ids.has(d.activeTimer.childId)?d.activeTimer.childId:fallback;if(childId&&cleanText(d.activeTimer.activity,80)&&d.activeTimer.startAt)activeTimer={...d.activeTimer,childId,activity:cleanText(d.activeTimer.activity,80),date:validDate(d.activeTimer.date)?d.activeTimer.date:today(),effort:clampInt(d.activeTimer.effort,1,5,2),note:cleanText(d.activeTimer.note,120)}}
  const auth=d.parentAuth&&typeof d.parentAuth==='object'?d.parentAuth:{};
  const parentAuth={pinSalt:cleanText(auth.pinSalt,300),pinHash:cleanText(auth.pinHash,300),iterations:clampInt(auth.iterations,50000,500000,PIN_ITERATIONS),autoLockMinutes:clampInt(auth.autoLockMinutes,1,30,5)};
  const rawMeta=d.meta&&typeof d.meta==='object'?d.meta:{},meta={lastBackupAt:safeIso(rawMeta.lastBackupAt),lastWriteAt:safeIso(rawMeta.lastWriteAt)};
  return {...base,schemaVersion:5,meta,pilot:{started:children.length>0},parentAuth,children,activeChildId,activeTimer,entries,approvalEvents,rewards,classes,joinRequests,paperImports,reminderHour:clampInt(d.reminderHour,0,23,base.reminderHour),reminderMinute:clampInt(d.reminderMinute,0,59,base.reminderMinute),school:{...base.school,...(d.school||{})}};
}
function exportBackup(){
  if(!guardParent())return;
  state.meta={...(state.meta||{}),lastBackupAt:nowIso()};persist();
  const payload={format:'aktywnik-plus-backup',version:5,exportedAt:nowIso(),data:state},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='aktywnik-plus-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#backupStatus').textContent='dziś';
}
async function importBackup(file){
  if(!guardParent()||!file)return;
  try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Plik kopii jest zbyt duży (maks. 2 MB).');const parsed=JSON.parse(await file.text());if(parsed.format&&parsed.format!=='aktywnik-plus-backup')throw new Error('To nie jest kopia Aktywnik+.');const candidate=safeBackupState(parsed),summary='Kopia zawiera '+candidate.children.length+' profili dzieci i '+candidate.entries.length+' wpisów. Zastąpić aktualne dane lokalne?';if(!confirm(summary))return;state=candidate;localStorage.setItem(KEY,JSON.stringify(state));sessionStorage.removeItem(PARENT_SESSION_KEY);alert('Kopia została przywrócona. Strefa rodzica zostanie ponownie zablokowana.');location.reload()}catch(err){alert('Nie udało się przywrócić kopii: '+err.message)}finally{$('#importBackupInput').value=''}
}
async function requestPersistentStorage(){if(!guardParent())return;try{const ok=await navigator.storage?.persist?.();$('#storageStatus').textContent=ok?'Przeglądarka zgodziła się chronić dane tego urządzenia.':'Przeglądarka nie potwierdziła trwałej pamięci. Regularnie eksportuj kopię.'}catch{$('#storageStatus').textContent='Nie udało się sprawdzić trwałej pamięci. Regularnie eksportuj kopię.'}}
async function renderStorageStatus(){const el=$('#storageStatus');if(!el||!parentUnlocked())return;try{const persisted=await navigator.storage?.persisted?.();el.textContent=persisted?'Dane mają włączoną trwałą pamięć przeglądarki.':'Dane są lokalne. Warto włączyć ochronę pamięci i regularnie robić kopię.'}catch{el.textContent='Dane są zapisane lokalnie w tej przeglądarce.'}}
function deleteLocalData(){if(!guardParent())return;if(!confirm('Usunąć wszystkie lokalne dane Aktywnik+ z tego urządzenia? Tej operacji nie można cofnąć bez wcześniejszej kopii.'))return;localStorage.removeItem(KEY);sessionStorage.removeItem(PARENT_SESSION_KEY);location.reload()}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#96;')}
function renderAll(){
  renderSaveStatus();renderPilot();
  if(!appReady())return;
  const child=activeChild();if(!child)return;
  renderTimer();renderActivities();renderChildOverview();renderChildEntries();renderChildRewards();renderStats();
  if(parentUnlocked()){
    renderParentChildren();renderParentSnapshot();renderApprovals();renderParentReport();renderSchoolSettings();renderClasses();renderJoinRequests();renderPaperImports();renderStorageStatus();
  }else{
    $('#approvalList').innerHTML='';$('#approvalHistory').innerHTML='';$('#pendingCount').textContent='0';$('#parentPanel').classList.add('hidden');$('#schoolPanel').classList.add('hidden');if(currentMode!=='child')currentMode='child';
  }
  $('#childPanel').classList.toggle('hidden',currentMode!=='child');
  $('#parentPanel').classList.toggle('hidden',currentMode!=='parent');
  $('#schoolPanel').classList.toggle('hidden',currentMode!=='school');
}
$('#activitySearch').oninput=renderActivities;
$('#repeatLastActivityBtn').onclick=repeatLastActivity;
$$('[data-duration]').forEach(b=>b.onclick=()=>setQuickDuration(b.dataset.duration));
$('#startPilotBtn').onclick=startPilot;
$('#parentAccessBtn').onclick=openParentGate;
$('#unlockParentBtn').onclick=unlockParent;
$('#parentPinInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();unlockParent()}};
$('#lockParentBtn').onclick=lockParent;
$('#openSchoolDemoBtn').onclick=()=>switchMode('school');
$('#schoolExitBtn').onclick=()=>switchMode('parent');
$('#parentChildSelect').onchange=e=>{if(!guardParent())return;parentSelectedChildId=e.target.value;renderAll()};
$('#childApprovalMode').onchange=saveApprovalMode;
$('#saveAutoLockBtn').onclick=saveAutoLockSetting;
$('#changeParentPinBtn').onclick=changeParentPin;
$('#addChildBtn').onclick=addChild;
$('#renameChildBtn').onclick=renameChild;
$('#setDeviceChildBtn').onclick=setDeviceChild;
$('#removeChildBtn').onclick=removeChild;
$('#exportBackupBtn').onclick=exportBackup;
$('#importBackupInput').onchange=e=>importBackup(e.target.files?.[0]);
$('#requestPersistentStorageBtn').onclick=requestPersistentStorage;
$('#deleteLocalDataBtn').onclick=deleteLocalData;
$('#createClassBtn').onclick=createClass;
$('#sendJoinRequestBtn').onclick=sendJoinRequest;
$('#addPaperChildBtn').onclick=addPaperChild;
$('#paperImportFile').onchange=e=>loadPaperImportFile(e.target.files?.[0]);
$('#parsePaperImportBtn').onclick=renderPaperImportPreview;
$('#savePaperImportBtn').onclick=savePaperImport;
$('#saveEntryBtn').onclick=saveEntry;
$('#startTimerBtn').onclick=startActivityTimer;
$('#stopTimerBtn').onclick=stopActivityTimer;
$('#cancelTimerBtn').onclick=cancelActivityTimer;
$('#cancelEntryBtn').onclick=cancelEntry;
$('#saveParentCorrectionBtn').onclick=saveParentCorrection;
$('#confirmRejectBtn').onclick=confirmReject;
$('#saveSchoolSettingsBtn').onclick=saveSchoolSettings;
$('#saveRewardBtn').onclick=saveReward;
$('#rewardChildId').onchange=renderSchoolSettings;
$('#reportPeriod').onchange=renderStats;
$('#parentReportMonth').value=parentReportMonth;
$('#parentReportMonth').onchange=()=>{parentReportMonth=safeReferenceMonth($('#parentReportMonth').value);renderParentReport()};
$('#approveAllBtn').onclick=approveAllVisible;
$('#editFavoritesBtn').onclick=()=>{renderFavoritesEditor();$('#favoritesDialog').showModal()};
$$('[data-report]').forEach(b=>b.onclick=()=>{reportType=b.dataset.report;renderParentReport()});
$('#exportCsvBtn').onclick=exportReportCsv;
$('#printReportBtn').onclick=()=>{if(guardParent())window.print()};
$('#printSchoolReportBtn').onclick=printSchoolMonthlyReport;
window.addEventListener('afterprint',()=>document.body.classList.remove('school-print-mode'));
setInterval(renderTimer,1000);
setInterval(()=>{if((currentMode==='parent'||currentMode==='school')&&!parentUnlocked())lockParent()},10000);
['pointerdown','keydown','touchstart'].forEach(evt=>document.addEventListener(evt,()=>{if((currentMode==='parent'||currentMode==='school')&&parentUnlocked())touchParentSession()},{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderTimer();if((currentMode==='parent'||currentMode==='school')&&!parentUnlocked())lockParent()}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderAll();
