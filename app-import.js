/* Aktywnik+ local import: files never leave the device. Uses vendored SheetJS. */
(function(){
'use strict';
const LIMIT=2000,MAX_BYTES=8*1024*1024;
let pending=null;
const root=()=>document.getElementById('structuredImportCard');
const aliases={
 date:['data','date','dzien','dzienaktywnosci','activitydate'],
 activity:['aktywnosc','activity','rodzajaktywnosci','nazwaktywnosci','sport','cwiczenie','trening','zajecia','rodzaj','activitytype'],
 minutes:['minuty','minutes','czasmin','czasminuty','czastrwania','czasaktywnosci','duration','czas','trwanie','iloscminut'],
 effort:['zmeczenie','wysilek','effort','intensywnosc','intensity','zmeczenie15'],
 note:['notatka','uwagi','opis','note','notes','komentarz'],
 profile:['profil','dziecko','child','name','nazwaprofilu'],
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
 return arr.map((r,i)=>Object.fromEntries(Object.keys(aliases).map(k=>[k,lookup(r,k)]).concat([['line',i+1]])));
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
 if(typeof value==='number')return value;
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
 confirm.disabled=!pending?.entries.length;
 if(!pending)return;
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
 const target=getTarget();if(!target){message('Import wymaga trybu osobistego albo odblokowanej strefy rodzica.',true);return}
 try{
  const rows=text!==null?matrixRows(parseDelimited(text)):await fileRows(file);
  const review=previewRows(rows,target,state.entries);
  pending={target,review,preparedAt:Date.now()};
  renderPreview();message(review.entries.length?'Sprawdź podgląd, a potem potwierdź import.':'Nie znaleziono nowych poprawnych wpisów.',!review.entries.length);
 }catch(error){message(error.message||String(error),true)}
}
function commit(){
 if(!pending||!pending.review.entries.length)return;
 const target=getTarget();
 if(!target||target.id!==pending.target.id){message('Profil zmienił się. Wybierz plik ponownie.',true);pending=null;renderPreview();return}
 // Re-check duplicate status at commit; no imported entry can overwrite or alter an existing entry.
 const review=previewRows(pending.review.entries,target,state.entries);
 if(!review.entries.length){message('Nie ma już nowych wpisów.',true);pending=null;renderPreview();return}
 if(state.entries.length+review.entries.length>5000){message('Przekroczono limit 5000 zapisanych aktywności.',true);return}
 const time=new Date().toISOString();
 if(!confirm('Dodać '+review.entries.length+' wpisów do profilu '+target.displayName+'? Istniejące wpisy zostaną zachowane.'))return;
 const additions=review.entries.map(e=>{
  const status=isSelfMode()||!approvalRequired(target)?'approved':'pending';
  return {...e,id:crypto.randomUUID(),status,source:'manual',createdAt:time,rejectionReason:''};
 });
 state.entries=[...additions,...state.entries];
 additions.forEach(e=>addApprovalEvent('created',e,'child','Import tabeli. Wymaga akceptacji rodzica zgodnie z ustawieniami profilu.'));
 persist();
 pending=null;renderPreview();
 message('Dodano '+additions.length+' aktywności. Dane zapisano lokalnie. W trybie rodzinnym wpisy mogą wymagać akceptacji.');
 document.getElementById('structuredImportFile').value='';
}
function init(){
 const form=root();if(!form)return;
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
 document.getElementById('structuredImportClear')?.addEventListener('click',()=>{
  pending=null;file.value='';text.value='';renderPreview();message('Wyczyszczono podgląd importu.');
 });
}
window.AktywnikTableImport={parseDelimited,matrixRows,jsonRows,parseDate,parseMinutes,previewRows,prepare};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();