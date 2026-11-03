'use strict';

(function(){
  const $=s=>document.querySelector(s);
  const OP_STORAGE_KEY='aktywnik-school-operation-ids-v1';
  const memoryOperations=new Map();
  let context=null,classes=[],years=[];
  let selectedClassId='',tenantLoadEpoch=0,lastLoadedTenant='';
  const invitationResults=new Map();
  const invitationTokens=new Map();

  function readOperationIds(){
    try{
      const value=JSON.parse(sessionStorage.getItem(OP_STORAGE_KEY)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {}}
  }
  function writeOperationIds(value){
    try{sessionStorage.setItem(OP_STORAGE_KEY,JSON.stringify(value))}catch{}
  }
  function randomOperationId(){
    if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    const bytes=new Uint8Array(16);
    if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    bytes[6]=(bytes[6]&15)|64;
    bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }
  async function operationFingerprint(scope,payload){
    const source=scope+'|'+JSON.stringify(payload);
    if(!window.crypto?.subtle)return null;
    const digest=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
    return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  async function getOperationId(scope,payload){
    const fingerprint=await operationFingerprint(scope,payload);
    const memoryKey=fingerprint?scope+':'+fingerprint:scope+'|'+JSON.stringify(payload);
    if(memoryOperations.has(memoryKey))return memoryOperations.get(memoryKey);
    if(fingerprint){
      const stored=readOperationIds(),storedId=stored[memoryKey];
      if(storedId){memoryOperations.set(memoryKey,storedId);return storedId}
      const id=randomOperationId();
      stored[memoryKey]=id;writeOperationIds(stored);memoryOperations.set(memoryKey,id);return id;
    }
    const id=randomOperationId();memoryOperations.set(memoryKey,id);return id;
  }
  async function clearOperationId(scope,payload){
    const fingerprint=await operationFingerprint(scope,payload);
    const memoryKey=fingerprint?scope+':'+fingerprint:scope+'|'+JSON.stringify(payload);
    memoryOperations.delete(memoryKey);
    if(fingerprint){
      const stored=readOperationIds();
      delete stored[memoryKey];
      writeOperationIds(stored);
    }
  }

  function status(message,kind=''){
    const el=$('#schoolCloudStatus');if(!el)return;
    el.textContent=message;el.dataset.kind=kind;
  }
  function esc(value){
    return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  async function session(){
    return window.AktywnikAuth?.validSession?.()||null;
  }
  async function api(path,options={}){
    const s=await session();
    if(!s?.access_token)throw Object.assign(new Error('authentication_required'),{status:401});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    let res;
    try{
      res=await fetch(path,{
        ...options,
        signal:controller.signal,
        headers:{
          'Content-Type':'application/json',
          Authorization:'Bearer '+s.access_token,
          ...(options.headers||{})
        }
      });
    }catch(err){
      if(err?.name==='AbortError'){
        throw Object.assign(new Error('Przekroczono czas oczekiwania. Spróbuj ponownie.'),{status:408,code:'request_timeout'});
      }
      throw err;
    }finally{
      clearTimeout(timeout);
    }
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok)throw Object.assign(new Error(data?.detail||data?.message||data?.error||('HTTP '+res.status)),{status:res.status,data});
    return data;
  }
  function selectedTenant(){
    return $('#schoolTenantSelect')?.value||'';
  }
  function selectedMembership(){
    const tenant=selectedTenant();
    return context?.memberships?.find(m=>m.tenant_id===tenant&&m.active!==false)||null;
  }
  function canStaff(){
    return ['teacher','school_admin'].includes(selectedMembership()?.role);
  }
  function isAdmin(){
    return selectedMembership()?.role==='school_admin';
  }
  function renderContext(){
    const profile=context?.profile;
    $('#schoolCloudProfile').textContent=(profile?.display_name||'Konto')+(profile?.profile_type?' · '+profile.profile_type:'');
    const memberships=(context?.memberships||[]).filter(m=>m.active!==false);
    const tenantSelect=$('#schoolTenantSelect');
    const chosenTenant=tenantSelect.value;
    tenantSelect.innerHTML=memberships.map(m=>'<option value="'+esc(m.tenant_id)+'">'+esc(m.role)+' · '+esc(m.tenant_id.slice(0,8))+'…</option>').join('');
    if(memberships.some(m=>m.tenant_id===chosenTenant))tenantSelect.value=chosenTenant;
    if(!memberships.length)tenantSelect.innerHTML='<option value="">Brak przypisanej szkoły</option>';
    $('#schoolRoleLabel').textContent=selectedMembership()?.role==='school_admin'?'Administrator szkoły':canStaff()?'Nauczyciel':'Opiekun';
    $('#schoolDashboard').classList.toggle('hidden',!canStaff());
    $('#schoolStaffPanel').classList.toggle('hidden',!canStaff());
    $('#schoolAdminCreateBox').classList.toggle('hidden',!canStaff());
    $('#schoolJoinRequestsPanel').classList.toggle('hidden',!canStaff());
    const children=context?.children||[];
    $('#schoolGuardianPanel').classList.toggle('hidden',profile?.profile_type!=='adult');
    $('#schoolGuardianChildSelect').innerHTML=children.length?children.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.display_name||'Dziecko')+'</option>').join(''):'<option value="">Najpierw utwórz profil dziecka</option>';
  }
  async function loadContext(){
    context=await api('/api/v1/me');
    renderContext();
    await loadTenantData();
  }
  async function loadYears(epoch=tenantLoadEpoch){
    const tenant=selectedTenant();
    if(!tenant){if(epoch===tenantLoadEpoch){years=[];$('#schoolYearSelect').replaceChildren()}return}
    const data=await api('/api/v1/school-years?tenantId='+encodeURIComponent(tenant));
    if(epoch!==tenantLoadEpoch||selectedTenant()!==tenant)return;
    years=(data.schoolYears||[]).filter(y=>y.tenant_id===tenant||!y.tenant_id);
    $('#schoolYearSelect').innerHTML=years.map(y=>'<option value="'+esc(y.id)+'">'+esc(y.label)+'</option>').join('');
    renderActiveClass();
  }
  async function loadClasses(epoch=tenantLoadEpoch){
    if(!canStaff()){if(epoch===tenantLoadEpoch){classes=[];renderClasses()}return}
    const tenant=selectedTenant();
    const data=await api('/api/v1/classes');
    if(epoch!==tenantLoadEpoch||selectedTenant()!==tenant)return;
    classes=(data.classes||[]).filter(c=>c.tenant_id===tenant&&c.archived_at===null);
    renderClasses();
  }
  function copyInvitationButton(token){
    const button=document.createElement('button');
    button.type='button';
    button.className='secondary';
    button.textContent='📋 Kopiuj kod';
    button.setAttribute('aria-label','Skopiuj prywatny kod zaproszenia rodziny');
    button.addEventListener('click',async()=>{
      try{
        if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
        await navigator.clipboard.writeText(token);
        status('Kod zaproszenia skopiowany. Przekaż go opiekunowi prywatnie.','ok');
      }catch{
        status('Nie można automatycznie skopiować kodu. Zaznacz widoczny kod i skopiuj go ręcznie.','error');
      }
    });
    return button;
  }
  function renderActiveClass(){
    const current=classes.find(c=>c.id===selectedClassId)||null;
    const panel=$('#schoolActiveClassCard'),active=$('#schoolActiveClassSelect');
    $('#schoolClassCount').textContent=String(classes.length);
    $('#schoolCurrentClassLabel').textContent=current?.name||'Brak klasy';
    if(panel)panel.classList.toggle('hidden',!current);
    if(!current)return;
    $('#schoolActiveClassName').textContent=current.name;
    const year=years.find(y=>y.id===current.school_year_id);
    $('#schoolActiveClassYear').textContent=year?.label?'Rok szkolny: '+year.label:'Wybierz rok szkolny w ustawieniach szkoły';
    const info=invitationResults.get(current.id)||'';
    const inviteResult=$('#schoolActiveInviteResult');
    inviteResult.textContent=info;
    const token=invitationTokens.get(current.id);
    if(token)inviteResult.append(document.createTextNode(' '),copyInvitationButton(token));
    if(active&&active.value!==current.id)active.value=current.id;
    const selected=$('#schoolRequestClassSelect');
    if(selected&&[...selected.options].some(opt=>opt.value===current.id))selected.value=current.id;
    document.querySelectorAll('[data-view-class]').forEach(btn=>{
      const yes=btn.dataset.viewClass===current.id;
      btn.setAttribute('aria-pressed',String(yes));
      btn.closest('article')?.classList.toggle('selected',yes);
    });
  }
  function selectClass(classId){
    if(!classes.some(c=>c.id===classId))return;
    selectedClassId=classId;
    renderActiveClass();
    $('#schoolCloudRequests').replaceChildren();
  }
  function renderClasses(){
    const box=$('#schoolCloudClasses'),requestSelect=$('#schoolRequestClassSelect'),activeSelect=$('#schoolActiveClassSelect');
    if(!box||!requestSelect||!activeSelect)return;
    if(!classes.some(c=>c.id===selectedClassId))selectedClassId=classes[0]?.id||'';
    box.replaceChildren();
    requestSelect.innerHTML=classes.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    activeSelect.innerHTML=classes.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    activeSelect.disabled=!classes.length;
    for(const c of classes){
      const article=document.createElement('article');
      const title=document.createElement('h3');title.textContent='🏫 '+c.name;
      const description=document.createElement('p');
      description.textContent='Pulpit klasy i zaproszenia rodziców';
      const actions=document.createElement('div');actions.className='cta';
      const choose=document.createElement('button');choose.type='button';
      choose.className='secondary';choose.dataset.viewClass=c.id;choose.textContent='Otwórz klasę';
      choose.addEventListener('click',()=>selectClass(c.id));
      const invite=document.createElement('button');invite.type='button';invite.className='secondary';
      invite.dataset.createInvite=c.id;invite.textContent='Utwórz zaproszenie';
      invite.addEventListener('click',()=>createInvite(c.id));
      actions.append(choose,invite);
      const output=document.createElement('p');output.dataset.inviteResult=c.id;output.setAttribute('role','status');
      output.textContent=invitationResults.get(c.id)||'';
      article.append(title,description,actions,output);box.append(article);
    }
    if(!classes.length){const empty=document.createElement('p');empty.textContent='Nie ma jeszcze klas widocznych dla tego konta. Jeśli masz uprawnienia, utwórz pierwszą klasę.';box.append(empty)}
    renderActiveClass();
  }
  async function loadTenantData(){
    // Increment epoch to prevent an older slow response from overwriting a newly selected school.
    const epoch=++tenantLoadEpoch;
    renderContext();
    const tenant=selectedTenant();
    const savedClass=tenant===lastLoadedTenant?selectedClassId:'';
    lastLoadedTenant=tenant;
    classes=[];years=[];selectedClassId='';invitationResults.clear();invitationTokens.clear();
    $('#schoolCloudRequests').replaceChildren();
    renderClasses();
    selectedClassId=savedClass;
    if(canStaff())await Promise.all([loadYears(epoch),loadClasses(epoch)]);
  }
  async function createClass(){
    const button=$('#schoolCloudCreateClassBtn'),tenant=selectedTenant(),schoolYearId=$('#schoolYearSelect').value,name=$('#schoolCloudClassName').value.trim();
    if(!tenant||!schoolYearId||!name){status('Wybierz rok i podaj nazwę klasy.','error');return}
    if(name.length>80){status('Nazwa klasy może mieć maksymalnie 80 znaków.','error');return}
    if(button?.disabled)return;
    if(!canStaff()){status('Brak uprawnień do tworzenia klas w tej szkole.','error');return}
    if(button)button.disabled=true;
    const payload={tenantId:tenant,schoolYearId,name};
    try{
      const operationId=await getOperationId('create-class',payload);
      await api('/api/v1/classes',{method:'POST',body:JSON.stringify({...payload,operationId})});
      await clearOperationId('create-class',payload);
      $('#schoolCloudClassName').value='';
      status('Klasa została utworzona.','ok');
      await loadClasses();
    }finally{
      if(button)button.disabled=false;
    }
  }
  async function createInvite(classId){
    if(!canStaff()||!classes.some(c=>c.id===classId)){status('Nie masz dostępu do tej klasy.','error');return}
    const buttons=[...document.querySelectorAll('[data-create-invite]')].filter(b=>b.dataset.createInvite===classId);
    buttons.push(...[...document.querySelectorAll('#schoolActiveCreateInviteBtn')].filter(()=>selectedClassId===classId));
    if(buttons.some(b=>b.disabled))return;
    buttons.forEach(b=>b.disabled=true);
    const payload={classId,validDays:14},epoch=tenantLoadEpoch;
    try{
      const operationId=await getOperationId('create-invite',payload);
      const data=await api('/api/v1/class-invites',{method:'POST',body:JSON.stringify({...payload,operationId})});
      await clearOperationId('create-invite',payload);
      if(epoch!==tenantLoadEpoch||!classes.some(c=>c.id===classId))return;
      const explanation=data.token?'Token dla rodzica (ważny 14 dni): '+data.token:'Zaproszenie utworzone.';
      invitationResults.set(classId,explanation);
      if(data.token)invitationTokens.set(classId,data.token);
      for(const out of [...document.querySelectorAll('[data-invite-result]')].filter(el=>el.dataset.inviteResult===classId)){
        out.textContent=explanation;
        if(data.token)out.append(document.createTextNode(' '),copyInvitationButton(data.token));
      }
      renderActiveClass();
    }finally{
      buttons.forEach(b=>b.disabled=false);
    }
  }
  async function createCloudChild(){
    const input=$('#schoolNewChildName'),button=$('#schoolCreateChildBtn'),displayName=input?.value.trim()||'';
    if(!displayName){status('Podaj nazwę profilu dziecka.','error');return}
    if(displayName.length>60){status('Nazwa profilu dziecka może mieć maksymalnie 60 znaków.','error');return}
    if(button?.disabled)return;
    if(button)button.disabled=true;
    const payload={displayName};
    const operationId=await getOperationId('create-child',payload);
    try{
      await api('/api/v1/family-children',{method:'POST',body:JSON.stringify({...payload,operationId})});
      await clearOperationId('create-child',payload);
      if(input)input.value='';
      status('Profil dziecka został utworzony w School Cloud.','ok');
      await loadContext();
    }finally{
      if(button)button.disabled=false;
    }
  }
  async function requestJoin(){
    const button=$('#schoolRequestJoinBtn'),childId=$('#schoolGuardianChildSelect').value,inviteToken=$('#schoolInviteTokenInput').value.trim();
    if(!childId||!inviteToken){status('Wybierz dziecko i podaj token zaproszenia.','error');return}
    if(button?.disabled)return;
    if(button)button.disabled=true;
    try{
      await api('/api/v1/class-join',{method:'POST',body:JSON.stringify({action:'request',childId,inviteToken})});
      $('#schoolInviteTokenInput').value='';
      status('Zgłoszenie zostało wysłane do szkoły.','ok');
    }finally{
      if(button)button.disabled=false;
    }
  }
  async function loadRequests(){
    const classId=$('#schoolRequestClassSelect').value,box=$('#schoolCloudRequests');
    if(!classId){box.innerHTML='<p>Brak wybranej klasy.</p>';return}
    const epoch=tenantLoadEpoch;
    const data=await api('/api/v1/class-join?classId='+encodeURIComponent(classId));
    if(epoch!==tenantLoadEpoch||$('#schoolRequestClassSelect').value!==classId)return;
    const requests=(data.requests||[]).filter(r=>r.status==='pending');
    box.innerHTML='';
    for(const r of requests){
      const article=document.createElement('article');
      article.innerHTML='<h3>Zgłoszenie '+esc(r.id.slice(0,8))+'…</h3><p>Dziecko: '+esc(r.child_id.slice(0,8))+'…</p><div class="cta"><button class="primary" type="button" data-request-id="'+esc(r.id)+'" data-decision="accepted">Akceptuj</button><button class="secondary" type="button" data-request-id="'+esc(r.id)+'" data-decision="rejected">Odrzuć</button></div>';
      article.querySelectorAll('[data-decision]').forEach(btn=>btn.addEventListener('click',()=>decide(r.id,btn.dataset.decision)));
      box.append(article);
    }
    if(!requests.length)box.innerHTML='<p>Brak oczekujących zgłoszeń.</p>';
  }
  async function decide(requestId,decision){
    const buttons=[...document.querySelectorAll('[data-request-id="'+CSS.escape(requestId)+'"]')];
    if(buttons.some(button=>button.disabled))return;
    buttons.forEach(button=>button.disabled=true);
    try{
      await api('/api/v1/class-join',{method:'POST',body:JSON.stringify({action:'decide',requestId,decision})});
      status(decision==='accepted'?'Zgłoszenie zaakceptowane.':'Zgłoszenie odrzucone.','ok');
      await loadRequests();
    }finally{
      buttons.forEach(button=>button.disabled=false);
    }
  }
  async function init(){
    const s=await session();
    if(!s){
      $('#schoolCloudLoginRequired').classList.remove('hidden');
      $('#schoolCloudMain').classList.add('hidden');
      return;
    }
    $('#schoolCloudLoginRequired').classList.add('hidden');
    $('#schoolCloudMain').classList.remove('hidden');
    try{await loadContext();status('Połączenie z School Cloud działa.','ok')}
    catch(err){
      if(err.status===401){$('#schoolCloudLoginRequired').classList.remove('hidden');$('#schoolCloudMain').classList.add('hidden')}
      status('Nie udało się wczytać School Cloud: '+err.message,'error');
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    $('#schoolTenantSelect')?.addEventListener('change',()=>loadTenantData().catch(err=>status(err.message,'error')));
    $('#schoolActiveClassSelect')?.addEventListener('change',event=>selectClass(event.target.value));
    $('#schoolActiveCreateInviteBtn')?.addEventListener('click',()=>createInvite(selectedClassId).catch(err=>status(err.message,'error')));
    $('#schoolActiveViewRequestsBtn')?.addEventListener('click',()=>{
      if(!selectedClassId)return;
      $('#schoolRequestClassSelect').value=selectedClassId;
      $('#schoolJoinRequestsPanel').scrollIntoView({behavior:'smooth',block:'start'});
      loadRequests().catch(err=>status(err.message,'error'));
    });
    $('#schoolCloudRefreshBtn')?.addEventListener('click',()=>loadContext().catch(err=>status(err.message,'error')));
    $('#schoolCloudCreateClassBtn')?.addEventListener('click',()=>createClass().catch(err=>status(err.message,'error')));
    $('#schoolCreateChildBtn')?.addEventListener('click',()=>createCloudChild().catch(err=>status(err.message,'error')));
    $('#schoolRequestJoinBtn')?.addEventListener('click',()=>requestJoin().catch(err=>status(err.message,'error')));
    $('#schoolLoadRequestsBtn')?.addEventListener('click',()=>loadRequests().catch(err=>status(err.message,'error')));
    init();
  });
})();
