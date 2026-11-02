/* Aktywnik+ local import: files never leave the device. Uses vendored SheetJS. */
(function(){
'use strict';
const LIMIT=2000,MAX_BYTES=8*1024*1024;
let pending=null;
const root=()=>document.getElementById('structuredImportCard');
const aliases={
 date:['data','date','dzien','dzienaktywnosci','dataaktywnosci','datawpisu','activitydate'],
 activity:['aktywnosc','activity','rodzajaktywnosci','nazwaktywnosci','sport','cwiczenie','trening','zajecia','rodzaj','activitytype'],
 minutes:['minuty','minutes','czasmin','czasminuty','czastrwania','czasaktywnosci','duration','czas','trwanie','iloscminut'],
 effort:['zmeczenie','poziomzmeczenia','wysilek','poziomwysilku','effort','intensywnosc','intensity','zmeczenie15'],
 note:['notatka','uwagi','opis','note','notes','komentarz'],
 profile:['profil','dziecko','uczen','uczennica','imieinazwisko','imienazwisko','nazwiskoiimie','studentname','imieucznia','nazwiskoucznia','nazwaucznia','nazwadziecka','osoba','student','child','name','nazwaprofilu'],
 id:['id','entryid','cliententryid']
};
function canon(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function lookup(row,key){
 const keys=Object.keys(row||{});
 const found=keys.find(k=>aliases[key].includes(canon(k)));
 return found===undefined?undefined:row[found];
}
function delim(text){
 const first=String(text).split(/\r?\n/)[0]||'';
 const chars=['\t',';',','];const counts=chars.map(c=>[c,first.split(c).length-1]);
 counts.sort((a,b)=>b[1]-a[1]);return counts[0][1]?counts[0][0]:';';
}
function parseDelimited(text,delimiter=delim(text)){
 if(text.length>MAX_BYTES)throw Error('Dane są zbyt duże (maksymalnie 8 MB).');
 text=text.replace(/^\uFEFF/,'');
 const result=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){field+='"';i++}
   else if(quoted)quoted=false;
   else if(field==='')quoted=true;
   else field+=c;
  }else if(!quoted&&c===delimiter){row.push(field);field=''}
  else if(!quoted&&(c==='\n'||c==='\r')){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field);field='';
   if(row.some(v=>String(v).trim()))result.push(row);
   row=[];
   if(result.length>LIMIT+7)throw Error('Maksymalnie 2000 wierszy w jednym imporcie.');
  }else field+=c;
  if(field.length>3000||row.length>60)throw Error('Zbyt duża liczba znaków lub kolumn.');
 }
 if(quoted)throw Error('CSV ma niedomknięty cudzysłów.');
 row.push(field);if(row.some(v=>String(v).trim()))result.push(row);
 return result;
}
function matrixRows(matrix){
 const rows=matrix.filter(row=>Array.isArray(row)&&row.some(cell=>String(cell??'').trim()));
 const head=rows.findIndex((row,i)=>i<6&&['date','activity','minutes'].every(k=>row.some(v=>aliases[k].includes(canon(v)))));
 if(head<0)throw Error('Brakuje nagłówków: Data, Aktywność, Minuty.');
 const names=rows[head].map(v=>String(v??''));
 const canonicalNames=names.map(canon);
 // Nie przypisuj cudzych danych do bieżącego dziecka, jeżeli arkusz ma nieznaną kolumnę tożsamości.
 if(canonicalNames.some(k=>/^(?:childid|studentid|uczenid|iducznia)$/.test(k)))
  throw Error('Arkusz zawiera identyfikatory uczniów. Importuj oddzielnie dla jednego profilu albo użyj pełnej kopii JSON.');
 if(canonicalNames.some(k=>/(uczn|dzieck|imie|nazwisk|student|person|osob)/.test(k)) &&
    !canonicalNames.some(k=>aliases.profile.includes(k)))
  throw Error('Nie rozpoznano nagłówka kolumny z uczniem. Zmień go na „Imię i nazwisko” lub „Uczeń”.');

 const cols={};for(const field of Object.keys(aliases)){cols[field]=names.findIndex(v=>aliases[field].includes(canon(v)))}
 const data=rows.slice(head+1);
 if(data.length>LIMIT)throw Error('Maksymalnie 2000 wierszy w jednym imporcie.');
 return data.map((r,i)=>Object.fromEntries(Object.entries(cols).filter(([,n])=>n>=0).map(([k,n])=>[k,r[n]??'']).concat([['line',head+i+2]])));
}
function jsonRows(json){
 if(json?.format==='aktywnik-plus-backup')throw Error('To kompletna kopia Aktywnik+. Wykorzystaj opcję „Dodaj wpisy z kopii”, aby zachować identyfikatory i przypisania.');
 const arr=Array.isArray(json)?json:(json?.entries||json?.rows||json?.activities||json?.data);
 if(!Array.isArray(arr))throw Error('JSON powinien zawierać tablicę wpisów, entries, rows, activities lub data.');
 if(arr.length>LIMIT)throw Error('Maksymalnie 2000 wpisów w jednym imporcie.');
 return arr.map((r,i)=>{
  if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Wpis JSON nr '+(i+1)+' nie jest obiektem.');
  const keys=Object.keys(r).map(canon);
  if(keys.some(k=>/^(?:childid|studentid|iducznia)$/.test(k)))
   throw Error('JSON zawiera identyfikator profilu. Do przenoszenia przypisań użyj pełnej kopii Aktywnika.');
  if(keys.some(k=>/(uczn|dzieck|imie|nazwisk|student|osob)/.test(k)) && lookup(r,'profile')===undefined)
   throw Error('JSON ma nieznane pole ucznia. Nazwij je „Uczeń” lub „Profil”.');
  return Object.fromEntries(Object.keys(aliases).map(k=>[k,lookup(r,k)]).concat([['line',i+1]]));
 });
}
function dateParts(y,m,d){
 const date=new Date(Date.UTC(y,m-1,d));
 if(y<1900||y>2100||date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
 return [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
function parseDate(v){
 if(v instanceof Date&&!Number.isNaN(v.valueOf()))return dateParts(v.getFullYear(),v.getMonth()+1,v.getDate());
 const text=String(v??'').trim();
 let m=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
 if(m)return dateParts(+m[1],+m[2],+m[3]);
 m=text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
 if(m)return dateParts(+m[1],+m[2],+m[3]);
 m=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
 if(m)return dateParts(+m[3],+m[2],+m[1]);
 const number=Number(text.replace(',','.'));
 if(number>=1&&number<110000&&Number.isFinite(number)){
  const dt=new Date(Date.UTC(1899,11,30)+Math.floor(number)*86400000);
  return dateParts(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
 }
 return null;
}
function parseMinutes(value){
 // Arkusze Excel kodują czas jako ułamek doby; niektóre komórki zwracają obiekt Date.
 if(value instanceof Date){
  if(Number.isNaN(value.valueOf()))return NaN;
  return value.getUTCHours()*60+value.getUTCMinutes()+value.getUTCSeconds()/60;
 }
 if(typeof value==='number')return value>0&&value<1?value*1440:value;
 const v=String(value??'').trim().toLowerCase();
 const clock=v.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
 if(clock)return +clock[1]*60+(+clock[2])+(+clock[3]||0)/60;
 const hours=v.match(/^(\d+(?:[.,]\d+)?)\s*h(?:\s*(\d+)\s*min)?$/);
 if(hours)return Number(hours[1].replace(',','.'))*60+Number(hours[2]||0);
 const numeric=v.replace(/\s*(min|minuty|minutes)\s*$/,'').replace(',','.');
 return Number(numeric);
}
function fingerprint(e){
 return [e.childId,e.date,canon(e.activity),e.minutes,e.effort,canon(e.note)].join('|');
}
function previewRows(raw,target,existing){
 const accepted=[],errors=[],seen=new Set(existing.map(fingerprint));
 let duplicate=0,otherProfile=0;
 if(raw.length>LIMIT)throw Error('Maksymalnie 2000 wpisów w jednym imporcie.');
 for(const item of raw){
  const line=item.line??'?';
  const profile=String(item.profile??'').trim();
  if(profile&&canon(profile)!==canon(target.displayName)){otherProfile++;continue}
  const date=parseDate(item.date),activity=String(item.activity??'').trim(),number=parseMinutes(item.minutes);
  const effortValue=String(item.effort??'').trim();
  const effort=effortValue===''?2:Number(effortValue.replace(',','.'));
  const note=String(item.note??'').trim();
  if(!date||date>localToday()||!activity||activity.length>80||!Number.isFinite(number)||number<1||number>600||
    !Number.isInteger(Math.round(number))||!Number.isFinite(effort)||!Number.isInteger(effort)||effort<1||effort>5||note.length>120){
    errors.push('Wiersz '+line+': sprawdź datę, aktywność, czas (1–600 min), zmęczenie (1–5) lub notatkę.');continue;
  }
  const draft={childId:target.id,date,activity,minutes:Math.round(number),effort,note};
  const key=fingerprint(draft);
  if(seen.has(key)){duplicate++;continue}
  seen.add(key);accepted.push(draft);
 }
 return {entries:accepted,errors,duplicate,otherProfile,scanned:raw.length};
}
function localToday(){
 const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
async function fileRows(file){
 if(!file||file.size>MAX_BYTES)throw Error('Plik przekracza limit 8 MB.');
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(ext==='json')return jsonRows(JSON.parse(await file.text()));
 if(ext==='csv'||ext==='tsv'||ext==='txt')return matrixRows(parseDelimited(await file.text(),ext==='tsv'?'\t':undefined));
 if(ext==='xlsx'||ext==='xls'||ext==='xlsm'||ext==='ods'){
  if(!window.XLSX?.read)throw Error('Moduł Excel jest niedostępny. Spróbuj ponownie po aktualizacji aplikacji.');
  const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:false,bookVBA:false});
  if(!book.SheetNames?.length)throw Error('Skoroszyt Excel nie ma arkuszy.');
  const selection=document.getElementById('structuredImportSheet');
  const selected=selection?.value;
  const name=selected&&book.SheetNames.includes(selected)?selected:book.SheetNames[0];
  if(selection){
   selection.replaceChildren(...book.SheetNames.slice(0,25).map(n=>{const option=document.createElement('option');option.value=n;option.textContent=n;return option}));
   selection.value=name;
   selection.parentElement.hidden=book.SheetNames.length<2;
  }
  const matrix=window.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});
  if(matrix.length>LIMIT+8)throw Error('Maksymalnie 2000 wierszy w jednym imporcie.');
  return matrixRows(matrix);
 }
 throw Error('Obsługiwane pliki: JSON, CSV, TSV, XLSX, XLS, XLSM, ODS.');
}
function getTarget(){
 if(!appReady())return null;
 if(isSelfMode())return activeChild();
 if(currentMode!=='parent'||!parentUnlocked())return null;
 return parentChild();
}
function message(text,error=false){
 const el=document.getElementById('structuredImportStatus');if(el){el.textContent=text;el.dataset.error=String(error)}
}
function renderPreview(){
 const box=document.getElementById('structuredImportPreview'),confirm=document.getElementById('structuredImportConfirm');
 if(!box||!confirm)return;
 box.hidden=!pending;
 confirm.disabled=pending?.kind==='backup'?false:!pending?.review?.entries?.length;
 if(!pending)return;
 if(pending.kind==='backup'){
  const {candidate,added}=pending;
  const title=document.createElement('strong');title.textContent='Kopia Aktywnik+';
  const summary=document.createElement('p');
  summary.textContent='Profile: '+candidate.children.length+' · wpisy w kopii: '+candidate.entries.length+' · nowe identyfikatory wpisów: '+added+'.';
  const hint=document.createElement('small');hint.textContent='Bez nadpisywania istniejących danych. Import wymaga tych samych profili i powiązań chmurowych.';
  box.replaceChildren(title,summary,hint);return;
 }
 const {target,review}=pending;
 const title=document.createElement('strong');
 title.textContent='Import do profilu: '+target.displayName;
 const summary=document.createElement('p');
 summary.textContent='Do dodania: '+review.entries.length+' | pominięte duplikaty: '+review.duplicate+
  ' | inne profile: '+review.otherProfile+' | błędne wiersze: '+review.errors.length+'.';
 const sample=document.createElement('ul');
 for(const e of review.entries.slice(0,5)){
  const li=document.createElement('li');li.textContent=e.date+' · '+e.activity+' · '+e.minutes+' min';sample.append(li);
 }
 const errors=document.createElement('small');
 errors.textContent=review.errors.slice(0,5).join(' ') || '';
 box.replaceChildren(title,summary,sample,errors);
}
async function prepare(file,text=null){
 pending=null;renderPreview();
 const target=getTarget();
 if(!target){message('Import wymaga utworzonego profilu i, w trybie rodzinnym, odblokowanej strefy rodzica.',true);return}
 try{
  const isJson=text===null&&file&&file.name.toLowerCase().endsWith('.json');
  if(isJson){
   if(file.size>MAX_BYTES)throw Error('Plik przekracza limit 8 MB.');
   const payload=JSON.parse(await file.text());
   if(payload?.format==='aktywnik-plus-backup'||(payload?.data?.children&&payload?.data?.entries)){
    const candidate=backupStateFromPayload(payload);
    if(candidate.profileMode!==state.profileMode)throw Error('Kopia należy do innego trybu. Aby zmienić tryb, skorzystaj z „Przywróć kopię” po zapisaniu obecnych danych.');
    const currentChildren=new Map(state.children.map(c=>[c.id,c]));
    if(candidate.children.some(c=>!currentChildren.has(c.id)||(c.cloudChildId||null)!==(currentChildren.get(c.id).cloudChildId||null)))
      throw Error('Kopia zawiera inny profil lub powiązanie chmurowe. Najpierw zapisz aktualne dane, potem użyj pełnego przywracania kopii.');
    const ids=new Set(state.entries.map(e=>e.id));
    const added=candidate.entries.filter(e=>!ids.has(e.id)).length;
    pending={kind:'backup',candidate,added,target,preparedAt:Date.now()};
    renderPreview();message(added?'Rozpoznano kopię Aktywnika. Sprawdź podgląd i potwierdź dodanie wpisów.':'Kopia nie zawiera nowych wpisów.');return;
   }
   const rows=jsonRows(payload),review=previewRows(rows,target,state.entries);
   pending={kind:'table',target,review,preparedAt:Date.now()};
  }else{
   const rows=text!==null?matrixRows(parseDelimited(text)):await fileRows(file);
   const review=previewRows(rows,target,state.entries);
   pending={kind:'table',target,review,preparedAt:Date.now()};
  }
  renderPreview();
  const review=pending.review;
  message(review.entries.length?'Rozpoznano '+review.scanned+' wierszy. Sprawdź podgląd i potwierdź.':'Nie znaleziono nowych poprawnych wpisów. '+review.errors.slice(0,2).join(' '),!review.entries.length);
 }catch(error){message('Import nieudany: '+(error.message||String(error)),true)}
}
function showImportedEntries(target,amount){
 const notice=document.getElementById('importSuccessBanner');
 if(notice){
  notice.hidden=false;
  document.getElementById('importSuccessText').textContent='Dodano '+amount+' wpisów do profilu '+target.displayName+'. Otwórz dziennik, aby je zobaczyć.';
  notice.dataset.childId=target.id;
 }
 if(isSelfMode()){
  window.AktywnikExperience?.setView?.('diary');
  notice?.scrollIntoView?.({behavior:'auto',block:'start'});
 }else{
  notice?.scrollIntoView?.({behavior:'auto',block:'start'});
 }
}
async function restoreAtStartup(file){
 const out=document.getElementById('setupRestoreBackupStatus');
 if(!file)return;
 try{
  if(appReady()||state.entries.length)throw Error('Na urządzeniu są już dane. Przywracanie przy pierwszym uruchomieniu jest dostępne tylko dla pustego profilu.');
  if(file.size>MAX_BYTES)throw Error('Kopia przekracza limit 8 MB.');
  const raw=JSON.parse(await file.text());
  if(raw?.format!=='aktywnik-plus-backup'&&!(raw?.data?.children&&raw?.data?.entries))
   throw Error('To nie jest kopia Aktywnika. Plik tabelaryczny wczytasz w zakładce Import i eksport po utworzeniu profilu.');
  const candidate=backupStateFromPayload(raw);
  if(!candidate.children.length)throw Error('Kopia nie zawiera profili.');
  if(candidate.profileMode==='family'&&!candidate.parentAuth?.pinHash)
   throw Error('Kopia rodzinna nie ma poprawnych danych PIN-u.');
  if(!confirm('Odzyskać '+candidate.children.length+' profili i '+candidate.entries.length+' aktywności? Konto chmurowe zostanie odłączone na tym urządzeniu.'))return;
  applyBackupCandidate(candidate);
  if(out)out.textContent='Kopia przywrócona. Otwieram dziennik.';
  try{sessionStorage.setItem('aktywnik-plus-current-view','diary')}catch{}
  location.reload();
 }catch(error){if(out)out.textContent='Nie udało się przywrócić: '+String(error.message||error)}
 finally{const input=document.getElementById('setupRestoreBackupInput');if(input)input.value=''}
}
function commit(){
 if(!pending)return;
 const target=getTarget();
 if(!target||target.id!==pending.target.id){message('Profil zmienił się. Wybierz plik ponownie.',true);pending=null;renderPreview();return}
 if(pending.kind==='backup'){
  if(!confirm('Dodać brakujące wpisy, decyzje i nagrody z kopii? Dane już zapisane zostaną zachowane.'))return;
  try{
   const result=mergeBackupCandidate(pending.candidate);
   renderAll();
   pending=null;renderPreview();
   message('Z kopii dodano '+result.entries+' wpisów, '+result.decisions+' decyzji i '+result.rewards+' nagród.');
   showImportedEntries(target,result.entries);
  }catch(error){message('Nie udało się połączyć kopii: '+String(error.message||error),true)}
  return;
 }
 if(!pending.review.entries.length)return;
 const review=previewRows(pending.review.entries,target,state.entries);
 if(!review.entries.length){message('Nie ma już nowych wpisów.',true);pending=null;renderPreview();return}
 if(state.entries.length+review.entries.length>5000){message('Przekroczono limit 5000 zapisanych aktywności.',true);return}
 if(!confirm('Dodać '+review.entries.length+' wpisów do profilu '+target.displayName+'? Istniejące dane zostaną zachowane.'))return;
 const time=new Date().toISOString();
 const additions=review.entries.map(e=>{
  const status=isSelfMode()||!approvalRequired(target)?'approved':'pending';
  return {...e,id:crypto.randomUUID(),status,source:'manual',createdAt:time,updatedAt:time,rejectionReason:''};
 });
 const previousEntries=state.entries,previousEvents=state.approvalEvents;
 state.entries=[...additions,...previousEntries];
 state.approvalEvents=[...previousEvents];
 additions.forEach(e=>addApprovalEvent('created',e,'child','Import tabeli. Wpis może wymagać zatwierdzenia przez opiekuna.'));
 persist();
 if(!lastPersistOk){
  state.entries=previousEntries;state.approvalEvents=previousEvents;
  renderAll();
  message('Błąd zapisu. Przywrócono poprzedni stan. Sprawdź miejsce w pamięci lub pobierz kopię danych.',true);
  return;
 }
 pending=null;renderPreview();
 message('Dodano '+additions.length+' aktywności. Dane zapisano lokalnie.');
 const input=document.getElementById('structuredImportFile');if(input)input.value='';
 showImportedEntries(target,additions.length);
}
function exportSpreadsheet(bookType){
 const child=getTarget();if(!child)return;
 try{
  if(!window.XLSX?.utils?.aoa_to_sheet)throw Error('Moduł Excel nie jest dostępny.');
  const safe=(v)=>String(v??'').replace(/^[=+@-]/,v=>'\''+v).slice(0,160);
  const rows=[['Data','Aktywność','Minuty','Zmęczenie','Notatka','Status']];
  for(const entry of state.entries.filter(e=>e.childId===child.id).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)))){
   rows.push([safe(entry.date),safe(entry.activity),Number(entry.minutes)||0,Number(entry.effort)||2,safe(entry.note),safe(entry.status)]);
  }
  const workbook=window.XLSX.utils.book_new();
  const sheet=window.XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols']=[{wch:15},{wch:29},{wch:11},{wch:15},{wch:45},{wch:16}];
  window.XLSX.utils.book_append_sheet(workbook,sheet,'Aktywności');
  const bytes=window.XLSX.write(workbook,{type:'array',bookType});
  const blob=new Blob([bytes],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='aktywnik-'+localToday()+'.'+(bookType==='biff8'?'xls':'xlsx');
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  message('Plik Excel przygotowany lokalnie.');
 }catch(error){message('Eksport Excel: '+String(error.message||error),true)}
}
function refreshVisibility(){
 const card=root();if(!card)return;
 const profileReady=appReady();
 const show=profileReady&&(
   (isSelfMode()&&currentMode==='child'&&!document.querySelector('[data-app-view="data"]')?.hidden)
   ||(!isSelfMode()&&currentMode==='parent'&&parentUnlocked())
 );
 card.hidden=!show;
 if(!show){pending=null;renderPreview()}
}
function init(){
 const form=root();if(!form)return;

 const setupFile=document.getElementById('setupRestoreBackupInput');
 setupFile?.addEventListener('change',()=>restoreAtStartup(setupFile.files?.[0]));
 document.getElementById('importShowEntriesBtn')?.addEventListener('click',()=>{
  const banner=document.getElementById('importSuccessBanner');
  const id=banner?.dataset?.childId;
  if(id&&state.children.some(c=>c.id===id)&&!isSelfMode()&&parentUnlocked()){
   state.activeChildId=id;persist();
  }
  switchMode('child',true);
  window.AktywnikExperience?.setView?.('diary');
 });
 document.getElementById('teamsLocalChallengesBtn')?.addEventListener('click',()=>{
  window.AktywnikPlayful?.open?.('challenges');
  document.getElementById('teamsIntroCard').hidden=true;
 });
 const file=document.getElementById('structuredImportFile');
 const text=document.getElementById('structuredImportPaste');
 const sheet=document.getElementById('structuredImportSheet');
 file?.addEventListener('change',async()=>{
  pending=null;
  if(sheet?.parentElement)sheet.parentElement.hidden=true;
  await prepare(file.files?.[0]);
 });
 sheet?.addEventListener('change',()=>{if(file.files?.[0])prepare(file.files[0])});
 document.getElementById('structuredImportPasteBtn')?.addEventListener('click',()=>prepare(null,text?.value||''));
 document.getElementById('structuredImportConfirm')?.addEventListener('click',commit);
 document.getElementById('structuredExportXlsx')?.addEventListener('click',()=>exportSpreadsheet('xlsx'));
 document.getElementById('structuredExportXls')?.addEventListener('click',()=>exportSpreadsheet('biff8'));
 document.getElementById('structuredImportClear')?.addEventListener('click',()=>{
  pending=null;file.value='';text.value='';renderPreview();message('Wyczyszczono podgląd importu.');
 });
 refreshVisibility();
}
window.AktywnikTableImport={parseDelimited,matrixRows,jsonRows,parseDate,parseMinutes,previewRows,prepare,refreshVisibility,restoreAtStartup,parseFile:fileRows};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();