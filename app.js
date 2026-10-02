const ACTIVITIES=[
['Spacer','🚶'],['Spacer z psem','🐕'],['Rower','🚲'],['Hulajnoga','🛴'],['Rolki','🛼'],['Deskorolka','🛹'],['Basen','🏊'],['Bieganie','🏃'],['Marsz','🥾'],['Piłka nożna','⚽'],['Koszykówka','🏀'],['Siatkówka','🏐'],['Tenis','🎾'],['Badminton','🏸'],['Tenis stołowy','🏓'],['Judo','🥋'],['Karate','🥋'],['Taniec','💃'],['Gimnastyka','🤸'],['Ćwiczenia w domu','🏠'],['SKS','🏫'],['Trening klubowy','🏅'],['Plac zabaw','🛝'],['Zabawa na podwórku','🌳'],['Trampolina','🤸'],['Wspinaczka','🧗'],['Park linowy','🌲'],['Wycieczka piesza','🥾'],['Góry','⛰️'],['Narty','⛷️'],['Snowboard','🏂'],['Łyżwy','⛸️'],['Kajak','🛶'],['Żagle','⛵'],['Frisbee','🥏'],['Rzutki / celność','🎯'],['Gra terenowa','🧭'],['Zabawy ruchowe','🎈'],['Rozciąganie','🧘'],['Inna aktywność','➕']
];
const KEY='aktywnik-plus-data-v1';
const MAX_BACKUP_BYTES=2*1024*1024;
const MAX_ENTRIES=5000;
const MAX_CLASSES=100;
const MAX_JOIN_REQUESTS=1000;
const PARENT_SESSION_KEY='aktywnik-plus-parent-unlocked-until';
const DEFAULT_FAVORITES=['Spacer','Rower','Hulajnoga','Basen','Piłka nożna'];
const PIN_ITERATIONS=120000;
const defaultState={schemaVersion:4,pilot:{started:false},parentAuth:{pinSalt:'',pinHash:'',iterations:PIN_ITERATIONS,autoLockMinutes:5},children:[],activeChildId:null,activeTimer:null,entries:[],approvalEvents:[],rewards:[],classes:[],joinRequests:[],reminderHour:19,reminderMinute:30,school:{deploymentModel:'school_saas',mode:'hybrid',requireParentApproval:true,useEffort:true,usePluses:true,gradeRule:'manual',maxCountedMinutes:null}};
let state=load(); let selected=null; let editingEntryId=null; let reportType='month'; let currentMode='child'; let parentSelectedChildId=state.activeChildId||state.children[0]?.id||null;
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return safeBackupState(saved)}catch{return structuredClone(defaultState)}}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
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
function pinConfigured(){return !!state.parentAuth?.pinHash&&!!state.parentAuth?.pinSalt}
function appReady(){return state.children.length>0&&pinConfigured()}
function bytesToB64(bytes){let out='';bytes.forEach(b=>out+=String.fromCharCode(b));return btoa(out)}
function b64ToBytes(value){const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function derivePin(pin,saltB64,iterations=PIN_ITERATIONS){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64ToBytes(saltB64),iterations},key,256);return bytesToB64(new Uint8Array(bits))}
async function setParentPin(pin){const salt=crypto.getRandomValues(new Uint8Array(16)),pinSalt=bytesToB64(salt),pinHash=await derivePin(pin,pinSalt,PIN_ITERATIONS);state.parentAuth={pinSalt,pinHash,iterations:PIN_ITERATIONS,autoLockMinutes:5}}
async function verifyParentPin(pin){if(!pinConfigured())return false;return await derivePin(pin,state.parentAuth.pinSalt,state.parentAuth.iterations||PIN_ITERATIONS)===state.parentAuth.pinHash}
function parentUnlocked(){return Number(sessionStorage.getItem(PARENT_SESSION_KEY)||0)>Date.now()}
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
function filtered(type){const start=startFor(type),end=new Date(today()+'T23:59:59');return state.entries.filter(e=>{if(e.status!=='approved'||!validDate(e.date))return false;const d=new Date(e.date+'T12:00:00');return d>=start&&d<=end})}
function stats(type){const es=filtered(type),minutes=es.reduce((s,e)=>s+e.minutes,0),days=new Set(es.map(e=>e.date)).size,types=new Set(es.map(e=>e.activity)).size;const counts={};es.forEach(e=>counts[e.activity]=(counts[e.activity]||0)+e.minutes);return {es,minutes,days,types,counts}}
function renderStats(){const s=stats($('#reportPeriod').value);$('#statsGrid').innerHTML=`<div class="stat"><strong>${fmtMin(s.minutes)}</strong><small>łączny czas</small></div><div class="stat"><strong>${s.days}</strong><small>aktywne dni</small></div><div class="stat"><strong>${s.es.length}</strong><small>aktywności</small></div><div class="stat"><strong>${s.types}</strong><small>różne rodzaje</small></div>`;const max=Math.max(1,...Object.values(s.counts));$('#activityBreakdown').innerHTML=Object.entries(s.counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>`<div class="bar-row"><span>${escapeHtml(n)}</span><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div><strong>${fmtMin(v)}</strong></div>`).join('')||'<small>Statystyki pojawią się po zatwierdzeniu aktywności.</small>'}
function reportTitle(t){return ({month:'Raport miesięczny',quarter:'Raport kwartalny',half:'Raport półroczny',year:'Raport roczny'})[t]}
function csvCell(v){const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
function exportReportCsv(){
  const s=stats(reportType);
  const rows=[['Dziecko / identyfikator',state.pilot?.childDisplayName||'Profil dziecka'],[],['Data','Aktywność','Czas (min)','Wysiłek 1-5','Źródło','Notatka']];
  s.es.forEach(e=>rows.push([e.date,e.activity,e.minutes,e.effort,e.source==='timer'?'Start/Stop':'wpis ręczny',e.note||'']));
  const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='aktywnik-plus-'+reportType+'-'+today()+'.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function renderParentReport(){const s=stats(reportType),child=escapeHtml(state.pilot?.childDisplayName||'Profil dziecka');$('#parentReport').innerHTML=`<div class="parent-only-print"><h2>${reportTitle(reportType)} — Aktywnik+</h2><p><strong>Dziecko / identyfikator:</strong> ${child}</p><p><small>Raport z bezpłatnej wersji pilotażowej — dane prowadzone lokalnie i zatwierdzone przez rodzica.</small></p><p><strong>Łączny czas:</strong> ${fmtMin(s.minutes)} · <strong>Aktywne dni:</strong> ${s.days} · <strong>Liczba aktywności:</strong> ${s.es.length} · <strong>Różne rodzaje:</strong> ${s.types}</p><div class="list">${s.es.map(e=>`<div class="entry"><div><strong>${escapeHtml(e.date)} — ${escapeHtml(e.activity)}</strong><small>${fmtMin(e.minutes)} · wysiłek ${e.effort}/5${e.note?` · ${escapeHtml(e.note)}`:''}</small></div></div>`).join('')||'<small>Brak zatwierdzonych wpisów w tym okresie.</small>'}</div><h3>Uwagi rodzica</h3><p>....................................................................................................</p><h3>Uwagi nauczyciela / wychowawcy</h3><p>....................................................................................................</p><p>....................................................................................................</p></div>`}
function renderFavoritesEditor(){
  const child=activeChild();if(!child)return;const box=$('#favoritesEditor');box.innerHTML='';
  ACTIVITIES.forEach(([name,emoji])=>{const label=document.createElement('label');label.className='favorite-check';label.innerHTML='<input type="checkbox" '+(child.favorites.includes(name)?'checked':'')+'> <span>'+emoji+' '+escapeHtml(name)+'</span>';const input=label.querySelector('input');input.onchange=()=>{if(input.checked&&!child.favorites.includes(name))child.favorites.push(name);if(!input.checked)child.favorites=child.favorites.filter(x=>x!==name);persist()};box.append(label)});
}
function openParentGate(){
  if(!pinConfigured()){document.querySelector('#pilotSetupCard')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  $('#parentPinInput').value='';$('#parentPinError').classList.add('hidden');$('#parentUnlockDialog').showModal();setTimeout(()=>$('#parentPinInput').focus(),20);
}
async function unlockParent(){
  const ok=await verifyParentPin($('#parentPinInput').value);
  if(!ok){$('#parentPinError').classList.remove('hidden');return}
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
function renderSchoolSettings(){const c=state.school||defaultState.school;$('#deploymentModel').value=c.deploymentModel||'school_saas';$('#schoolMode').value=c.mode;$('#requireParentApproval').value=c.requireParentApproval?'yes':'no';$('#useEffort').value=c.useEffort?'yes':'no';$('#usePluses').value=c.usePluses?'yes':'no';$('#gradeRule').value=c.gradeRule||'manual';$('#maxCountedMinutes').value=c.maxCountedMinutes??'';$('#rewardDate').value=$('#rewardDate').value||today();const box=$('#rewardHistory');box.innerHTML='';[...(state.rewards||[])].sort((a,b)=>String(b.date??'').localeCompare(String(a.date??''))).forEach(r=>{const el=document.createElement('div');el.className='entry';el.innerHTML=`<div><strong>${r.type==='plus'?'Plus':'Ocena'} · ${escapeHtml(r.value)}</strong><small>${escapeHtml(r.date)}${r.note?` · ${escapeHtml(r.note)}`:''}</small></div>`;box.append(el)});if(!(state.rewards||[]).length)box.innerHTML='<small>Brak zapisanych plusów i ocen.</small>'}
function saveSchoolSettings(){state.school={deploymentModel:$('#deploymentModel').value,mode:$('#schoolMode').value,requireParentApproval:$('#requireParentApproval').value==='yes',useEffort:$('#useEffort').value==='yes',usePluses:$('#usePluses').value==='yes',gradeRule:$('#gradeRule').value,maxCountedMinutes:$('#maxCountedMinutes').value?Number($('#maxCountedMinutes').value):null};persist()}
function saveReward(){const value=$('#rewardValue').value.trim();if(!value)return;state.rewards=state.rewards||[];state.rewards.unshift({id:crypto.randomUUID(),type:$('#rewardType').value,value,date:$('#rewardDate').value||today(),note:$('#rewardNote').value.trim(),createdAt:new Date().toISOString()});$('#rewardValue').value='';$('#rewardNote').value='';persist()}
function makeClassCode(name){const base=(name||'KL').replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase()||'KL';return base+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function createClass(){const name=cleanText($('#newClassName').value,40),schoolYear=cleanText($('#newSchoolYear').value,12);if(!name)return;state.classes=state.classes||[];if(state.classes.length>=MAX_CLASSES){alert('Osiągnięto limit klas w lokalnym pilocie.');return}state.classes.unshift({id:crypto.randomUUID(),name,schoolYear:schoolYear||'2026/2027',code:makeClassCode(name),archived:false,children:[],createdAt:new Date().toISOString()});$('#newClassName').value='';persist()}
function sendJoinRequest(){const childName=cleanText($('#joinChildName').value,60),code=cleanText($('#joinClassCode').value,12).toUpperCase(),mode=['digital','hybrid','paper'].includes($('#joinMode').value)?$('#joinMode').value:'digital';const klass=(state.classes||[]).find(c=>!c.archived&&String(c.code||'').toUpperCase()===code);if(!childName||!klass){$('#joinRequestStatus').innerHTML='<p class="status-pending">Sprawdź nazwę dziecka i kod klasy.</p>';return}state.joinRequests=state.joinRequests||[];if(state.joinRequests.length>=MAX_JOIN_REQUESTS){$('#joinRequestStatus').innerHTML='<p class="status-pending">Osiągnięto limit zgłoszeń lokalnego pilota.</p>';return}const duplicate=state.joinRequests.some(r=>r.classId===klass.id&&String(r.childName||'').toLowerCase()===childName.toLowerCase()&&r.status==='pending');if(duplicate){$('#joinRequestStatus').innerHTML='<p class="status-pending">Takie zgłoszenie już czeka na nauczyciela.</p>';return}state.joinRequests.unshift({id:crypto.randomUUID(),classId:klass.id,childName,mode,status:'pending',createdAt:new Date().toISOString()});persist();$('#joinRequestStatus').innerHTML='<p class="status-approved">Zgłoszenie wysłane. Czeka na akceptację nauczyciela.</p>'}
function acceptJoinRequest(id){const req=(state.joinRequests||[]).find(r=>r.id===id);if(!req)return;const klass=(state.classes||[]).find(c=>c.id===req.classId);if(!klass)return;klass.children=klass.children||[];if(!klass.children.some(c=>c.name.toLowerCase()===req.childName.toLowerCase()))klass.children.push({id:crypto.randomUUID(),name:req.childName,mode:req.mode,reportStatus:'missing',joinedAt:new Date().toISOString()});req.status='accepted';persist()}
function rejectJoinRequest(id){const req=(state.joinRequests||[]).find(r=>r.id===id);if(req){req.status='rejected';persist()}}
function addPaperChild(){const classId=$('#paperClassId').value,name=cleanText($('#paperChildName').value,60);const klass=(state.classes||[]).find(c=>c.id===classId);if(!klass||!name)return;klass.children=klass.children||[];if(klass.children.some(c=>String(c.name||'').toLowerCase()===name.toLowerCase())){alert('To dziecko jest już na liście tej klasy.');return}klass.children.push({id:crypto.randomUUID(),name,mode:'paper',reportStatus:'missing',joinedAt:new Date().toISOString()});$('#paperChildName').value='';persist()}
function setReportStatus(classId,childId,status){const klass=(state.classes||[]).find(c=>c.id===classId);const child=klass?.children?.find(c=>c.id===childId);if(child){child.reportStatus=status;persist()}}
function renderClasses(){const classes=(state.classes||[]).filter(c=>!c.archived);const box=$('#classList');if(!box)return;box.innerHTML='';classes.forEach(c=>{const children=c.children||[];const el=document.createElement('div');el.className='entry';const childRows=children.map(ch=>`<div class="class-child"><span><strong>${escapeHtml(ch.name)}</strong> · ${ch.mode==='paper'?'papier':ch.mode==='hybrid'?'hybrydowo':'cyfrowo'}</span><select data-report-class="${escapeAttr(c.id)}" data-report-child="${escapeAttr(ch.id)}"><option value="missing" ${ch.reportStatus==='missing'?'selected':''}>brak raportu</option><option value="preparing" ${ch.reportStatus==='preparing'?'selected':''}>w przygotowaniu</option><option value="submitted" ${ch.reportStatus==='submitted'?'selected':''}>oddany</option><option value="reviewed" ${ch.reportStatus==='reviewed'?'selected':''}>sprawdzony</option></select></div>`).join('');el.innerHTML=`<div style="width:100%"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.schoolYear)} · kod klasy: <b>${escapeHtml(c.code)}</b> · ${children.length} dzieci</small>${childRows?'<div class="class-children">'+childRows+'</div>':'<small>Brak dzieci w klasie.</small>'}</div>`;box.append(el)});if(!classes.length)box.innerHTML='<small>Nie utworzono jeszcze żadnej klasy.</small>';const select=$('#paperClassId');if(select)select.innerHTML=classes.map(c=>`<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)} — ${escapeHtml(c.schoolYear)}</option>`).join('');$$('[data-report-child]').forEach(s=>s.onchange=()=>setReportStatus(s.dataset.reportClass,s.dataset.reportChild,s.value))}
function renderJoinRequests(){const pending=(state.joinRequests||[]).filter(r=>r.status==='pending');const box=$('#classJoinRequests');if(!box)return;$('#classRequestBadge').textContent=pending.length?`${pending.length} oczekuje`:'';box.innerHTML='';pending.forEach(r=>{const klass=(state.classes||[]).find(c=>c.id===r.classId);const el=document.createElement('div');el.className='entry';el.innerHTML=`<div><strong>${escapeHtml(r.childName)}</strong><small>${escapeHtml(klass?.name||'Klasa')} · ${r.mode==='paper'?'papier':r.mode==='hybrid'?'hybrydowo':'cyfrowo'}</small></div><div class="entry-actions"><button class="primary" data-join-accept="${escapeAttr(r.id)}">Akceptuj</button><button class="ghost" data-join-reject="${escapeAttr(r.id)}">Odrzuć</button></div>`;box.append(el)});if(!pending.length)box.innerHTML='<small>Brak oczekujących zgłoszeń.</small>';$$('[data-join-accept]').forEach(b=>b.onclick=()=>acceptJoinRequest(b.dataset.joinAccept));$$('[data-join-reject]').forEach(b=>b.onclick=()=>rejectJoinRequest(b.dataset.joinReject))}

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
  const joinRequests=(Array.isArray(d.joinRequests)?d.joinRequests:[]).slice(0,MAX_JOIN_REQUESTS).map(r=>r&&typeof r==='object'?{...r,childId:ids.has(r.childId)?r.childId:null,childName:cleanText(r.childName,60),status:['pending','accepted','rejected'].includes(r.status)?r.status:'pending'}:null).filter(Boolean);
  let activeTimer=null;
  if(d.activeTimer&&typeof d.activeTimer==='object'){const childId=ids.has(d.activeTimer.childId)?d.activeTimer.childId:fallback;if(childId&&cleanText(d.activeTimer.activity,80)&&d.activeTimer.startAt)activeTimer={...d.activeTimer,childId,activity:cleanText(d.activeTimer.activity,80),date:validDate(d.activeTimer.date)?d.activeTimer.date:today(),effort:clampInt(d.activeTimer.effort,1,5,2),note:cleanText(d.activeTimer.note,120)}}
  const auth=d.parentAuth&&typeof d.parentAuth==='object'?d.parentAuth:{};
  const parentAuth={pinSalt:cleanText(auth.pinSalt,300),pinHash:cleanText(auth.pinHash,300),iterations:clampInt(auth.iterations,50000,500000,PIN_ITERATIONS),autoLockMinutes:clampInt(auth.autoLockMinutes,1,30,5)};
  return {...base,schemaVersion:4,pilot:{started:children.length>0},parentAuth,children,activeChildId,activeTimer,entries,approvalEvents,rewards,classes,joinRequests,reminderHour:clampInt(d.reminderHour,0,23,base.reminderHour),reminderMinute:clampInt(d.reminderMinute,0,59,base.reminderMinute),school:{...base.school,...(d.school||{})}};
}
function exportBackup(){const payload={format:'aktywnik-plus-backup',version:3,exportedAt:new Date().toISOString(),data:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`aktywnik-plus-kopia-${today()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);const s=$('#backupStatus');if(s)s.textContent='kopia zapisana'}
async function importBackup(file){if(!file)return;try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Plik kopii jest zbyt duży (maks. 2 MB).');const parsed=JSON.parse(await file.text());if(parsed.format&&parsed.format!=='aktywnik-plus-backup')throw new Error('To nie jest kopia Aktywnik+.');state=safeBackupState(parsed);persist();const s=$('#backupStatus');if(s)s.textContent='kopia przywrócona';alert('Kopia danych została przywrócona.')}catch(err){alert('Nie udało się przywrócić kopii: '+err.message)}finally{$('#importBackupInput').value=''}}
async function requestPersistentStorage(){const el=$('#storageStatus');if(!navigator.storage?.persist){if(el)el.textContent='Ta przeglądarka nie udostępnia funkcji trwałej pamięci.';return}try{const granted=await navigator.storage.persist();if(el)el.textContent=granted?'Przeglądarka przyznała trwałą pamięć dla danych Aktywnik+.':'Przeglądarka nie przyznała trwałej pamięci. Regularnie eksportuj kopię.'}catch{if(el)el.textContent='Nie udało się sprawdzić trwałej pamięci. Regularnie eksportuj kopię.'}}
async function renderStorageStatus(){const el=$('#storageStatus');if(!el||!navigator.storage?.persisted)return;try{const persisted=await navigator.storage.persisted();if(persisted)el.textContent='Dane mają przyznaną trwałą pamięć na tym urządzeniu.'}catch{}}
function deleteLocalData(){if(!confirm('Usunąć wszystkie lokalne dane Aktywnik+ z tego urządzenia? Tej operacji nie można cofnąć bez wcześniejszej kopii.'))return;localStorage.removeItem(KEY);location.reload()}

function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#96;')}
function renderAll(){renderPilot();renderTimer();renderActivities();renderChildEntries();renderApprovals();renderStats();renderParentReport();renderSchoolSettings();renderClasses();renderJoinRequests();renderStorageStatus()}
$('#activitySearch').oninput=renderActivities;$('#startPilotBtn').onclick=startPilot;$('#exportBackupBtn').onclick=exportBackup;$('#importBackupInput').onchange=e=>importBackup(e.target.files?.[0]);$('#requestPersistentStorageBtn').onclick=requestPersistentStorage;$('#deleteLocalDataBtn').onclick=deleteLocalData;$('#createClassBtn').onclick=createClass;$('#sendJoinRequestBtn').onclick=sendJoinRequest;$('#addPaperChildBtn').onclick=addPaperChild;$('#saveEntryBtn').onclick=saveEntry;$('#startTimerBtn').onclick=startActivityTimer;$('#stopTimerBtn').onclick=stopActivityTimer;$('#cancelTimerBtn').onclick=cancelActivityTimer;$('#cancelEntryBtn').onclick=()=>$('#entryCard').classList.add('hidden');$('#childModeBtn').onclick=()=>switchMode('child');$('#parentModeBtn').onclick=()=>switchMode('parent');$('#schoolModeBtn').onclick=()=>switchMode('school');$('#saveSchoolSettingsBtn').onclick=saveSchoolSettings;$('#saveRewardBtn').onclick=saveReward;$('#reportPeriod').onchange=renderStats;$('#approveAllBtn').onclick=()=>{state.entries.forEach(e=>{if(e.status==='pending')e.status='approved'});persist()};$('#editFavoritesBtn').onclick=()=>{renderFavoritesEditor();$('#favoritesDialog').showModal()};$$('[data-report]').forEach(b=>b.onclick=()=>{reportType=b.dataset.report;renderParentReport()});$('#exportCsvBtn').onclick=exportReportCsv;$('#printReportBtn').onclick=()=>window.print();
setInterval(renderTimer,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderTimer()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderAll();