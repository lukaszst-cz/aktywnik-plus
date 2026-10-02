const ACTIVITIES=[
['Spacer','🚶'],['Spacer z psem','🐕'],['Rower','🚲'],['Hulajnoga','🛴'],['Rolki','🛼'],['Deskorolka','🛹'],['Basen','🏊'],['Bieganie','🏃'],['Marsz','🥾'],['Piłka nożna','⚽'],['Koszykówka','🏀'],['Siatkówka','🏐'],['Tenis','🎾'],['Badminton','🏸'],['Tenis stołowy','🏓'],['Judo','🥋'],['Karate','🥋'],['Taniec','💃'],['Gimnastyka','🤸'],['Ćwiczenia w domu','🏠'],['SKS','🏫'],['Trening klubowy','🏅'],['Plac zabaw','🛝'],['Zabawa na podwórku','🌳'],['Trampolina','🤸'],['Wspinaczka','🧗'],['Park linowy','🌲'],['Wycieczka piesza','🥾'],['Góry','⛰️'],['Narty','⛷️'],['Snowboard','🏂'],['Łyżwy','⛸️'],['Kajak','🛶'],['Żagle','⛵'],['Frisbee','🥏'],['Rzutki / celność','🎯'],['Gra terenowa','🧭'],['Zabawy ruchowe','🎈'],['Rozciąganie','🧘'],['Inna aktywność','➕']
];
const KEY='aktywnik-plus-data-v1';
const MAX_BACKUP_BYTES=2*1024*1024;
const MAX_ENTRIES=5000;
const MAX_CLASSES=100;
const MAX_JOIN_REQUESTS=1000;
const defaultState={schemaVersion:3,pilot:{started:false,childDisplayName:''},activeTimer:null,favorites:['Spacer','Rower','Hulajnoga','Basen','Piłka nożna'],entries:[],rewards:[],classes:[],joinRequests:[],reminderHour:19,reminderMinute:30,school:{deploymentModel:'school_saas',mode:'hybrid',requireParentApproval:true,useEffort:true,usePluses:true,gradeRule:'manual',maxCountedMinutes:null}};
let state=load(); let selected=null; let reportType='month';
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return {...structuredClone(defaultState),...saved,pilot:{...defaultState.pilot,...(saved.pilot||{})},activeTimer:saved.activeTimer||null,favorites:Array.isArray(saved.favorites)?saved.favorites:defaultState.favorites,entries:Array.isArray(saved.entries)?saved.entries:[],rewards:Array.isArray(saved.rewards)?saved.rewards:[],classes:Array.isArray(saved.classes)?saved.classes:[],joinRequests:Array.isArray(saved.joinRequests)?saved.joinRequests:[],school:{...defaultState.school,...(saved.school||{})}}}catch{return structuredClone(defaultState)}}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function fmtMin(m){const h=Math.floor(m/60),r=m%60;return h?`${h} h${r?` ${r} min`:''}`:`${r} min`}
function today(){const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function cleanText(v,max=160){return String(v??'').trim().slice(0,max)}
function clampInt(v,min,max,fallback){const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback}
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v??'')))return false;return !Number.isNaN(new Date(String(v)+'T12:00:00').getTime())}
function allowedActivityDate(v){return validDate(v)&&v<=today()}
function pickActivity(name){selected=name;$('#selectedActivityTitle').textContent=name;$('#activityDate').value=today();$('#entryCard').classList.remove('hidden');$('#entryCard').scrollIntoView({behavior:'smooth',block:'center'})}
function activityButton([name,emoji]){const b=document.createElement('button');b.className='activity';b.innerHTML=`<span class="emoji">${emoji}</span>${name}`;b.onclick=()=>pickActivity(name);return b}
function renderActivities(){const fav=$('#favoriteActivities');fav.innerHTML='';ACTIVITIES.filter(a=>state.favorites.includes(a[0])).forEach(a=>fav.append(activityButton(a)));const q=$('#activitySearch').value.toLowerCase();const all=$('#allActivities');all.innerHTML='';ACTIVITIES.filter(a=>a[0].toLowerCase().includes(q)).forEach(a=>all.append(activityButton(a)))}
function startActivityTimer(){
  if(!selected||state.activeTimer)return;
  const date=$('#activityDate').value||today();
  if(!allowedActivityDate(date)){alert('Data aktywności nie może być z przyszłości.');return}
  state.activeTimer={
    activity:selected,
    startAt:new Date().toISOString(),
    date,
    effort:clampInt($('#activityEffort').value,1,5,2),
    note:cleanText($('#activityNote').value,120)
  };
  selected=null;
  $('#activityNote').value='';
  $('#entryCard').classList.add('hidden');
  persist();
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
  const card=$('#timerStatusCard');
  if(!card)return;
  const active=state.activeTimer;
  card.classList.toggle('hidden',!active);
  if(!active)return;
  $('#timerActivityName').textContent=active.activity;
  $('#timerElapsed').textContent=fmtClock(timerElapsedSeconds());
  $('#timerStartedAt').textContent='Start: '+new Date(active.startAt).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
}
function stopActivityTimer(){
  const t=state.activeTimer;
  if(!t)return;
  const seconds=timerElapsedSeconds();
  const minutes=clampInt(Math.max(1,Math.round(seconds/60)),1,600,1);
  state.entries.unshift({
    id:crypto.randomUUID(),
    date:t.date||today(),
    activity:t.activity,
    minutes,
    effort:Number(t.effort)||2,
    note:t.note||'',
    status:'pending',
    source:'timer',
    startedAt:t.startAt,
    stoppedAt:new Date().toISOString(),
    measuredSeconds:seconds,
    createdAt:new Date().toISOString()
  });
  state.activeTimer=null;
  persist();
}
function cancelActivityTimer(){
  if(!state.activeTimer)return;
  if(confirm('Anulować trwający pomiar? Czas nie zostanie zapisany.')){
    state.activeTimer=null;
    persist();
  }
}
function saveEntry(){const minutes=Number($('#activityDuration').value),date=$('#activityDate').value||today();if(!selected||!Number.isFinite(minutes)||minutes<1||minutes>600){alert('Podaj czas od 1 do 600 minut.');return}if(!allowedActivityDate(date)){alert('Data aktywności nie może być z przyszłości.');return}state.entries.unshift({id:crypto.randomUUID(),date,activity:selected,minutes:Math.round(minutes),effort:clampInt($('#activityEffort').value,1,5,2),note:cleanText($('#activityNote').value,120),status:'pending',createdAt:new Date().toISOString()});selected=null;$('#activityNote').value='';$('#entryCard').classList.add('hidden');persist()}
function statusLabel(e){return e.status==='approved'?'<span class="status-approved">✓ zatwierdzone</span>':'<span class="status-pending">⏳ czeka na rodzica</span>'}
function renderChildEntries(){const box=$('#childEntries');box.innerHTML='';state.entries.slice(0,12).forEach(e=>{const el=document.createElement('div');el.className='entry';el.innerHTML=`<div><strong>${escapeHtml(e.activity)} · ${fmtMin(e.minutes)}</strong><small>${escapeHtml(e.date)} · wysiłek ${e.effort}/5${e.note?` · ${escapeHtml(e.note)}`:''}<br>${statusLabel(e)}</small></div>`;box.append(el)});if(!state.entries.length)box.innerHTML='<small>Jeszcze nie ma wpisów.</small>';const pending=state.entries.filter(e=>e.status==='pending').length;$('#pendingChildBadge').textContent=pending?`${pending} do zatwierdzenia`:'';$('#todayMinutes').textContent=state.entries.filter(e=>e.date===today()).reduce((s,e)=>s+e.minutes,0)}
function approve(id){const e=state.entries.find(x=>x.id===id);if(e)e.status='approved';persist()}
function removeEntry(id){state.entries=state.entries.filter(x=>x.id!==id);persist()}
function renderApprovals(){const p=state.entries.filter(e=>e.status==='pending');$('#pendingCount').textContent=p.length;const list=$('#approvalList');list.innerHTML='';p.forEach(e=>{const el=document.createElement('div');el.className='entry';el.innerHTML=`<div><strong>${escapeHtml(e.activity)} · ${fmtMin(e.minutes)}</strong><small>${escapeHtml(e.date)} · wysiłek ${e.effort}/5${e.note?` · ${escapeHtml(e.note)}`:''}</small></div><div class="entry-actions"><button class="primary" data-approve="${escapeAttr(e.id)}">Akceptuj</button><button class="ghost" data-remove="${escapeAttr(e.id)}">Usuń</button></div>`;list.append(el)});if(!p.length)list.innerHTML='<small>Wszystko zatwierdzone.</small>';$$('[data-approve]').forEach(b=>b.onclick=()=>approve(b.dataset.approve));$$('[data-remove]').forEach(b=>b.onclick=()=>removeEntry(b.dataset.remove));const n=new Date(),after=n.getHours()>state.reminderHour||(n.getHours()===state.reminderHour&&n.getMinutes()>=state.reminderMinute);$('#approvalReminder').classList.toggle('hidden',!(after&&p.length))}
function startFor(type,d=new Date()){const y=d.getFullYear(),m=d.getMonth();if(type==='month')return new Date(y,m,1);if(type==='quarter')return new Date(y,Math.floor(m/3)*3,1);if(type==='half')return new Date(y,m<6?0:6,1);return new Date(y,0,1)}
function filtered(type){const start=startFor(type),end=new Date(today()+'T23:59:59');return state.entries.filter(e=>{if(e.status!=='approved'||!validDate(e.date))return false;const d=new Date(e.date+'T12:00:00');return d>=start&&d<=end})}
function stats(type){const es=filtered(type),minutes=es.reduce((s,e)=>s+e.minutes,0),days=new Set(es.map(e=>e.date)).size,types=new Set(es.map(e=>e.activity)).size;const counts={};es.forEach(e=>counts[e.activity]=(counts[e.activity]||0)+e.minutes);return {es,minutes,days,types,counts}}
function renderStats(){const s=stats($('#reportPeriod').value);$('#statsGrid').innerHTML=`<div class="stat"><strong>${fmtMin(s.minutes)}</strong><small>łączny czas</small></div><div class="stat"><strong>${s.days}</strong><small>aktywne dni</small></div><div class="stat"><strong>${s.es.length}</strong><small>aktywności</small></div><div class="stat"><strong>${s.types}</strong><small>różne rodzaje</small></div>`;const max=Math.max(1,...Object.values(s.counts));$('#activityBreakdown').innerHTML=Object.entries(s.counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>`<div class="bar-row"><span>${escapeHtml(n)}</span><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div><strong>${fmtMin(v)}</strong></div>`).join('')||'<small>Statystyki pojawią się po zatwierdzeniu aktywności.</small>'}
function reportTitle(t){return ({month:'Raport miesięczny',quarter:'Raport kwartalny',half:'Raport półroczny',year:'Raport roczny'})[t]}
function renderParentReport(){const s=stats(reportType),child=escapeHtml(state.pilot?.childDisplayName||'Profil dziecka');$('#parentReport').innerHTML=`<div class="parent-only-print"><h2>${reportTitle(reportType)} — Aktywnik+</h2><p><strong>Dziecko / identyfikator:</strong> ${child}</p><p><small>Raport z bezpłatnej wersji pilotażowej — dane prowadzone lokalnie i zatwierdzone przez rodzica.</small></p><p><strong>Łączny czas:</strong> ${fmtMin(s.minutes)} · <strong>Aktywne dni:</strong> ${s.days} · <strong>Liczba aktywności:</strong> ${s.es.length} · <strong>Różne rodzaje:</strong> ${s.types}</p><div class="list">${s.es.map(e=>`<div class="entry"><div><strong>${escapeHtml(e.date)} — ${escapeHtml(e.activity)}</strong><small>${fmtMin(e.minutes)} · wysiłek ${e.effort}/5${e.note?` · ${escapeHtml(e.note)}`:''}</small></div></div>`).join('')||'<small>Brak zatwierdzonych wpisów w tym okresie.</small>'}</div><h3>Uwagi rodzica</h3><p>....................................................................................................</p><h3>Uwagi nauczyciela / wychowawcy</h3><p>....................................................................................................</p><p>....................................................................................................</p></div>`}
function renderFavoritesEditor(){const box=$('#favoritesEditor');box.innerHTML='';ACTIVITIES.forEach(([name,emoji])=>{const l=document.createElement('label');l.innerHTML=`<input type="checkbox" ${state.favorites.includes(name)?'checked':''} data-fav="${name}"> ${emoji} ${name}`;box.append(l)});$$('[data-fav]').forEach(c=>c.onchange=()=>{if(c.checked&&!state.favorites.includes(c.dataset.fav))state.favorites.push(c.dataset.fav);if(!c.checked)state.favorites=state.favorites.filter(x=>x!==c.dataset.fav);persist();renderFavoritesEditor()})}
function switchMode(mode){const child=mode==='child',parent=mode==='parent',school=mode==='school';$('#childPanel').classList.toggle('hidden',!child);$('#parentPanel').classList.toggle('hidden',!parent);$('#schoolPanel').classList.toggle('hidden',!school);$('#childModeBtn').classList.toggle('active',child);$('#parentModeBtn').classList.toggle('active',parent);$('#schoolModeBtn').classList.toggle('active',school)}
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

function startPilot(){const name=$('#pilotChildName').value.trim();state.pilot={started:true,childDisplayName:name||'Profil dziecka'};persist()}
function renderPilot(){const card=$('#pilotSetupCard');if(!card)return;card.classList.toggle('hidden',!!state.pilot?.started);const label=$('#childDisplayName');if(label)label.textContent=state.pilot?.childDisplayName?`· ${state.pilot.childDisplayName}`:''}
function safeBackupState(raw){
  const base=structuredClone(defaultState);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Nieprawidłowy plik kopii.');
  const d=raw.data&&typeof raw.data==='object'&&!Array.isArray(raw.data)?raw.data:raw;
  const entries=(Array.isArray(d.entries)?d.entries:[]).slice(0,MAX_ENTRIES).map(e=>{
    if(!e||typeof e!=='object'||!validDate(e.date)||!cleanText(e.activity,80))return null;
    const minutes=clampInt(e.minutes,1,600,0);if(!minutes)return null;
    return {...e,id:cleanText(e.id,80)||crypto.randomUUID(),date:e.date,activity:cleanText(e.activity,80),minutes,effort:clampInt(e.effort,1,5,2),note:cleanText(e.note,120),status:['pending','approved','rejected'].includes(e.status)?e.status:'pending'};
  }).filter(Boolean);
  const classes=(Array.isArray(d.classes)?d.classes:[]).slice(0,MAX_CLASSES);
  const joinRequests=(Array.isArray(d.joinRequests)?d.joinRequests:[]).slice(0,MAX_JOIN_REQUESTS);
  const allowed=new Set(ACTIVITIES.map(a=>a[0]));
  const favorites=(Array.isArray(d.favorites)?d.favorites:base.favorites).map(x=>cleanText(x,80)).filter(x=>allowed.has(x)).slice(0,20);
  return {...base,schemaVersion:3,pilot:{...base.pilot,...(d.pilot||{}),childDisplayName:cleanText(d.pilot?.childDisplayName,60)},activeTimer:d.activeTimer&&typeof d.activeTimer==='object'?d.activeTimer:null,favorites:favorites.length?favorites:base.favorites,entries,rewards:Array.isArray(d.rewards)?d.rewards.slice(0,1000):[],classes,joinRequests,reminderHour:clampInt(d.reminderHour,0,23,base.reminderHour),reminderMinute:clampInt(d.reminderMinute,0,59,base.reminderMinute),school:{...base.school,...(d.school||{})}};
}
function exportBackup(){const payload={format:'aktywnik-plus-backup',version:3,exportedAt:new Date().toISOString(),data:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`aktywnik-plus-kopia-${today()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);const s=$('#backupStatus');if(s)s.textContent='kopia zapisana'}
async function importBackup(file){if(!file)return;try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Plik kopii jest zbyt duży (maks. 2 MB).');const parsed=JSON.parse(await file.text());if(parsed.format&&parsed.format!=='aktywnik-plus-backup')throw new Error('To nie jest kopia Aktywnik+.');state=safeBackupState(parsed);persist();const s=$('#backupStatus');if(s)s.textContent='kopia przywrócona';alert('Kopia danych została przywrócona.')}catch(err){alert('Nie udało się przywrócić kopii: '+err.message)}finally{$('#importBackupInput').value=''}}
async function requestPersistentStorage(){const el=$('#storageStatus');if(!navigator.storage?.persist){if(el)el.textContent='Ta przeglądarka nie udostępnia funkcji trwałej pamięci.';return}try{const granted=await navigator.storage.persist();if(el)el.textContent=granted?'Przeglądarka przyznała trwałą pamięć dla danych Aktywnik+.':'Przeglądarka nie przyznała trwałej pamięci. Regularnie eksportuj kopię.'}catch{if(el)el.textContent='Nie udało się sprawdzić trwałej pamięci. Regularnie eksportuj kopię.'}}
async function renderStorageStatus(){const el=$('#storageStatus');if(!el||!navigator.storage?.persisted)return;try{const persisted=await navigator.storage.persisted();if(persisted)el.textContent='Dane mają przyznaną trwałą pamięć na tym urządzeniu.'}catch{}}
function deleteLocalData(){if(!confirm('Usunąć wszystkie lokalne dane Aktywnik+ z tego urządzenia? Tej operacji nie można cofnąć bez wcześniejszej kopii.'))return;localStorage.removeItem(KEY);location.reload()}

function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#96;')}
function renderAll(){renderPilot();renderTimer();renderActivities();renderChildEntries();renderApprovals();renderStats();renderParentReport();renderSchoolSettings();renderClasses();renderJoinRequests();renderStorageStatus()}
$('#activitySearch').oninput=renderActivities;$('#startPilotBtn').onclick=startPilot;$('#exportBackupBtn').onclick=exportBackup;$('#importBackupInput').onchange=e=>importBackup(e.target.files?.[0]);$('#requestPersistentStorageBtn').onclick=requestPersistentStorage;$('#deleteLocalDataBtn').onclick=deleteLocalData;$('#createClassBtn').onclick=createClass;$('#sendJoinRequestBtn').onclick=sendJoinRequest;$('#addPaperChildBtn').onclick=addPaperChild;$('#saveEntryBtn').onclick=saveEntry;$('#startTimerBtn').onclick=startActivityTimer;$('#stopTimerBtn').onclick=stopActivityTimer;$('#cancelTimerBtn').onclick=cancelActivityTimer;$('#cancelEntryBtn').onclick=()=>$('#entryCard').classList.add('hidden');$('#childModeBtn').onclick=()=>switchMode('child');$('#parentModeBtn').onclick=()=>switchMode('parent');$('#schoolModeBtn').onclick=()=>switchMode('school');$('#saveSchoolSettingsBtn').onclick=saveSchoolSettings;$('#saveRewardBtn').onclick=saveReward;$('#reportPeriod').onchange=renderStats;$('#approveAllBtn').onclick=()=>{state.entries.forEach(e=>{if(e.status==='pending')e.status='approved'});persist()};$('#editFavoritesBtn').onclick=()=>{renderFavoritesEditor();$('#favoritesDialog').showModal()};$$('[data-report]').forEach(b=>b.onclick=()=>{reportType=b.dataset.report;renderParentReport()});$('#printReportBtn').onclick=()=>window.print();
setInterval(renderTimer,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderTimer()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderAll();