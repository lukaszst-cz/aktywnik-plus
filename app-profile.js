/* Aktywnik+ private profile art. Photos never leave the device. */
(function(){
'use strict';
const DB='aktywnik-plus-private-profile-images-v1',STORE='photos';
const STYLES={boy:'icons/avatar-boy.svg',girl:'icons/avatar-girl.svg',star:'icons/aktywnik-logo.svg'};
const photoCache=new Map();
const $=s=>document.querySelector(s);
function message(area,value,error=false){
 const el=$('#avatarStatus'+(area==='parent'?'Parent':'Self'));
 if(el){el.textContent=value;el.dataset.error=error?'true':'false'}
}
function target(area){
 if(!appReady())return null;
 if(area==='self')return isSelfMode()&&currentMode==='child'?activeChild():null;
 if(area==='parent')return !isSelfMode()&&currentMode==='parent'&&parentUnlocked()?parentChild():null;
 return null;
}
function openDatabase(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error('Przeglądarka nie obsługuje prywatnej pamięci zdjęć.'));return}
  let request;
  try{request=indexedDB.open(DB,1)}catch(error){reject(error);return}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Pamięć zdjęć jest niedostępna.'));
  request.onblocked=()=>reject(new Error('Zamknij inne otwarte karty Aktywnika.'));
 });
}
async function transaction(type,key,data){
 const db=await openDatabase();
 try{
  return await new Promise((resolve,reject)=>{
   let result=null,request;
   const tx=db.transaction(STORE,type);
   tx.oncomplete=()=>resolve(result);
   tx.onerror=()=>reject(tx.error||new Error('Błąd pamięci zdjęć.'));
   tx.onabort=()=>reject(tx.error||new Error('Zapis został anulowany.'));
   const store=tx.objectStore(STORE);
   if(type==='readonly')request=store.get(key);
   else if(key===null)request=store.clear();
   else if(data===null)request=store.delete(key);
   else request=store.put(data,key);
   request.onsuccess=()=>{result=request.result};
  });
 }finally{db.close()}
}
function forgetUrl(id){
 const old=photoCache.get(id);
 photoCache.delete(id);
 if(old)old.then(url=>{if(url)URL.revokeObjectURL(url)}).catch(()=>{});
}
async function photoUrl(id){
 if(!photoCache.has(id)){
  const promise=transaction('readonly',id).then(blob=>blob instanceof Blob?URL.createObjectURL(blob):null)
   .catch(()=>null);
  photoCache.set(id,promise);
 }
 return photoCache.get(id);
}
function fallback(child){
 return STYLES[child?.avatarStyle]||STYLES.star;
}
function chooseImage(img,child){
 if(!img||!child)return;
 const id=child.id,staticUrl=fallback(child);
 img.dataset.child=id;
 img.src=staticUrl;
 photoUrl(id).then(url=>{
  if(img.dataset.child!==id||!document.contains(img))return;
  img.src=url||staticUrl;
 }).catch(()=>{});
}
function refreshCard(area){
 const suffix=area==='parent'?'Parent':'Self',card=$('#profileAvatarCard'+suffix);
 if(!card)return;
 const child=target(area);
 card.hidden=!child;
 if(!child)return;
 const name=$('#avatarProfileName'+suffix);
 if(name)name.textContent=child.displayName;
 chooseImage($('#avatarPreview'+suffix),child);
 const style=child.avatarStyle||'star';
 card.querySelectorAll('[data-avatar-style]').forEach(b=>{
  const active=b.dataset.avatarStyle===style;
  b.classList.toggle('selected',active);
  b.setAttribute('aria-pressed',active?'true':'false');
 });
}
function refreshHeader(){
 const img=$('#navProfileInitial'),child=typeof activeChild==='function'?activeChild():null;
 if(!img||!child)return;
 img.style.backgroundImage='url("'+fallback(child)+'")';
 img.classList.add('profile-picture-shown');
 const id=child.id;
 img.dataset.child=id;
 photoUrl(id).then(url=>{
  if(img.dataset.child!==id||!document.contains(img))return;
  img.style.backgroundImage='url("'+(url||fallback(child))+'")';
 });
}
function refresh(){
 refreshCard('self');refreshCard('parent');refreshHeader();
}
function setStyle(area,style){
 if(!Object.prototype.hasOwnProperty.call(STYLES,style))return;
 const child=target(area);
 if(!child)return;
 const previous=child.avatarStyle;
 child.avatarStyle=style;
 persist({skipSync:true});
 if(!lastPersistOk){
  child.avatarStyle=previous;
  renderAll();
  message(area,'Nie udało się zapisać postaci.',true);return;
 }
 message(area,'Postać zapisana. Możesz ją zmienić w dowolnym momencie.');
 refresh();
}
async function shrink(file){
 if(!file||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw new Error('Wybierz JPG, PNG lub WebP o wielkości do 5 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(new Error('Nie można odczytać obrazu.'));
   image.src=url;
  });
  const width=image.naturalWidth,height=image.naturalHeight;
  if(!width||!height||width>16000||height>16000)throw new Error('Nieprawidłowe wymiary zdjęcia.');
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Brak możliwości pomniejszenia zdjęcia.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
  const side=Math.min(width,height);
  ctx.drawImage(image,(width-side)/2,(height-side)/2,side,side,0,0,256,256);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.77));
  if(!blob||blob.size>250*1024)throw new Error('Nie można skompresować zdjęcia.');
  return blob;
 }finally{URL.revokeObjectURL(url)}
}
async function upload(area,file){
 const child=target(area);
 if(!child||!file)return;
 const id=child.id;
 message(area,'Przygotowuję prywatne zdjęcie...');
 try{
  const blob=await shrink(file);
  await transaction('readwrite',id,blob);
  forgetUrl(id);
  refresh();
  message(area,'Zdjęcie zapisane tylko na tym urządzeniu. Nie trafi do chmury ani rankingów.');
 }catch(error){message(area,'Zdjęcie nie zostało zapisane: '+String(error.message||error),true)}
}
async function eraseForChild(id){
 if(!id)return;
 try{await transaction('readwrite',id,null)}catch(error){
  if(!/pamięci zdjęć jest niedostępna|nie obsługuje/i.test(String(error.message||error)))throw error;
 }
 forgetUrl(id);
}
async function clearAll(){
 await transaction('readwrite',null,null);
 for(const id of [...photoCache.keys()])forgetUrl(id);
}
async function remove(area){
 const child=target(area);if(!child)return;
 try{
  await eraseForChild(child.id);
  refresh();message(area,'Własne zdjęcie usunięte z urządzenia. Domyślna postać pozostała.');
 }catch(error){message(area,'Nie udało się usunąć zdjęcia: '+String(error.message||error),true)}
}
function init(){
 for(const area of ['self','parent']){
  const suffix=area==='parent'?'Parent':'Self',card=$('#profileAvatarCard'+suffix);
  if(!card)continue;
  card.querySelectorAll('[data-avatar-style]').forEach(b=>b.addEventListener('click',()=>setStyle(area,b.dataset.avatarStyle)));
  const file=$('#avatarUpload'+suffix);
  file?.addEventListener('change',()=>{const selected=file.files?.[0];if(selected)upload(area,selected);file.value=''});
  $('#avatarRemove'+suffix)?.addEventListener('click',()=>remove(area));
 }
 refresh();
}
window.AktywnikProfiles={refresh,eraseForChild,clearAll,styles:STYLES};
window.addEventListener('pagehide',()=>{for(const id of [...photoCache.keys()])forgetUrl(id)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();