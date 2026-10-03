'use strict';

(function(){
  const $=s=>document.querySelector(s);
  let context=null,classes=[],years=[];

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
    const res=await fetch(path,{
      ...options,
      headers:{
        'Content-Type':'application/json',
        Authorization:'Bearer '+s.access_token,
        ...(options.headers||{})
      }
    });
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
    tenantSelect.innerHTML=memberships.map(m=>'<option value="'+esc(m.tenant_id)+'">'+esc(m.role)+' · '+esc(m.tenant_id.slice(0,8))+'…</option>').join('');
    $('#schoolStaffPanel').classList.toggle('hidden',!canStaff());
    $('#schoolAdminCreateBox').classList.toggle('hidden',!isAdmin());
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
  async function loadYears(){
    const tenant=selectedTenant();
    if(!tenant){years=[];$('#schoolYearSelect').innerHTML='';return}
    const data=await api('/api/v1/school-years?tenantId='+encodeURIComponent(tenant));
    years=data.schoolYears||[];
    $('#schoolYearSelect').innerHTML=years.map(y=>'<option value="'+esc(y.id)+'">'+esc(y.label)+'</option>').join('');
  }
  async function loadClasses(){
    if(!canStaff()){classes=[];renderClasses();return}
    const data=await api('/api/v1/classes');
    const tenant=selectedTenant();
    classes=(data.classes||[]).filter(c=>c.tenant_id===tenant);
    renderClasses();
  }
  function renderClasses(){
    const box=$('#schoolCloudClasses'),select=$('#schoolRequestClassSelect');
    if(!box||!select)return;
    box.innerHTML='';
    select.innerHTML=classes.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    for(const c of classes){
      const article=document.createElement('article');
      article.innerHTML='<h3>'+esc(c.name)+'</h3><p>Klasa zabezpieczona RLS.</p><div class="cta"><button class="secondary" type="button" data-create-invite="'+esc(c.id)+'">Utwórz zaproszenie</button></div><p data-invite-result="'+esc(c.id)+'"></p>';
      box.append(article);
    }
    if(!classes.length)box.innerHTML='<p>Brak klas widocznych dla tego konta.</p>';
    box.querySelectorAll('[data-create-invite]').forEach(btn=>btn.addEventListener('click',()=>createInvite(btn.dataset.createInvite)));
  }
  async function loadTenantData(){
    renderContext();
    if(canStaff())await Promise.all([loadYears(),loadClasses()]);
    else{years=[];classes=[];renderClasses()}
  }
  async function createClass(){
    const button=$('#schoolCloudCreateClassBtn'),tenant=selectedTenant(),schoolYearId=$('#schoolYearSelect').value,name=$('#schoolCloudClassName').value.trim();
    if(!tenant||!schoolYearId||!name){status('Wybierz rok i podaj nazwę klasy.','error');return}
    if(name.length>80){status('Nazwa klasy może mieć maksymalnie 80 znaków.','error');return}
    if(button?.disabled)return;
    if(button)button.disabled=true;
    try{
      await api('/api/v1/classes',{method:'POST',body:JSON.stringify({tenantId:tenant,schoolYearId,name})});
      $('#schoolCloudClassName').value='';
      status('Klasa została utworzona.','ok');
      await loadClasses();
    }finally{
      if(button)button.disabled=false;
    }
  }
  async function createInvite(classId){
    const button=document.querySelector('[data-create-invite="'+CSS.escape(classId)+'"]');
    if(button?.disabled)return;
    if(button)button.disabled=true;
    try{
      const data=await api('/api/v1/class-invites',{method:'POST',body:JSON.stringify({classId,validDays:14})});
      const out=document.querySelector('[data-invite-result="'+CSS.escape(classId)+'"]');
      if(out)out.textContent=data.token?'Token (14 dni): '+data.token:'Zaproszenie utworzone.';
    }finally{
      if(button)button.disabled=false;
    }
  }
  async function createCloudChild(){
    const input=$('#schoolNewChildName'),button=$('#schoolCreateChildBtn'),displayName=input?.value.trim()||'';
    if(!displayName){status('Podaj nazwę profilu dziecka.','error');return}
    if(displayName.length>60){status('Nazwa profilu dziecka może mieć maksymalnie 60 znaków.','error');return}
    if(button?.disabled)return;
    if(button)button.disabled=true;
    try{
      await api('/api/v1/family-children',{method:'POST',body:JSON.stringify({displayName})});
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
    const data=await api('/api/v1/class-join?classId='+encodeURIComponent(classId));
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
    $('#schoolCloudRefreshBtn')?.addEventListener('click',()=>loadContext().catch(err=>status(err.message,'error')));
    $('#schoolCloudCreateClassBtn')?.addEventListener('click',()=>createClass().catch(err=>status(err.message,'error')));
    $('#schoolCreateChildBtn')?.addEventListener('click',()=>createCloudChild().catch(err=>status(err.message,'error')));
    $('#schoolRequestJoinBtn')?.addEventListener('click',()=>requestJoin().catch(err=>status(err.message,'error')));
    $('#schoolLoadRequestsBtn')?.addEventListener('click',()=>loadRequests().catch(err=>status(err.message,'error')));
    init();
  });
})();
