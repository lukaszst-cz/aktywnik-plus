const port=process.argv[2]||'9225';
const targetPrefix=process.argv[3]||'https://aktywnik-plus.vercel.app/app.html';
const deadline=Date.now()+45000;

async function waitForPage(){
  while(Date.now()<deadline){
    try{
      const list=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      const page=list.find(x=>x.type==='page'&&x.url.startsWith(targetPrefix));
      if(page)return page;
    }catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('Production Chrome DevTools page not found');
}

const page=await waitForPage();
const ws=new WebSocket(page.webSocketDebuggerUrl);
let id=0;
const pending=new Map();
ws.onmessage=e=>{
  const msg=JSON.parse(e.data);
  if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id)}
};
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});

function call(method,params={}){
  return new Promise(resolve=>{
    const callId=++id;
    pending.set(callId,resolve);
    ws.send(JSON.stringify({id:callId,method,params}));
  });
}
async function evaluate(expression){
  const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.result?.exceptionDetails){
    throw new Error(response.result.exceptionDetails.text||'Production UI evaluation failed');
  }
  return response.result?.result?.value;
}
async function waitFor(expression,label,timeout=15000){
  const until=Date.now()+timeout;
  while(Date.now()<until){
    if(await evaluate(expression))return true;
    await new Promise(r=>setTimeout(r,150));
  }
  throw new Error('Timed out: '+label);
}
function assert(value,message){if(!value)throw new Error(message)}

try{
  await waitFor(
    "document.readyState==='complete' && !!document.getElementById('pilotSetupCard')",
    'production app load'
  );

  await evaluate(`(()=>{
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('aktywnik_plus_lang','pl');
    location.reload();
    return true;
  })()`);
  await waitFor(
    "document.readyState==='complete' && document.documentElement.lang==='pl' && !!document.getElementById('pilotSetupCard')",
    'Polish production app reload'
  );

  const initial=await evaluate(`({
    version:document.querySelector('.version-badge')?.textContent?.trim()||'',
    setupVisible:!document.getElementById('pilotSetupCard')?.classList.contains('hidden'),
    fatigueLabel:document.querySelector('[data-i18n="app.effort"]')?.textContent?.trim()||'',
    fatigueOutput:document.getElementById('activityEffortValue')?.textContent?.trim()||'',
    hasFamily:[...document.getElementById('setupMode')?.options||[]].some(o=>o.value==='family')
  })`);
  assert(initial.version.includes('0.5.0 beta.4'),'production UI version badge mismatch');
  assert(initial.setupVisible,'first-run setup is not visible');
  assert(initial.hasFamily,'family mode missing from production onboarding');
  assert(initial.fatigueLabel.includes('Zmęczenie 1–5'),'fatigue 1–5 label missing');
  assert(initial.fatigueOutput==='2/5','default fatigue value is not visible');

  await evaluate(`(()=>{
    const mode=document.getElementById('setupMode');
    mode.value='family';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('pilotChildName').value='Pilot UI';
    document.getElementById('parentPinSetup').value='2468';
    document.getElementById('parentPinConfirm').value='2468';
    document.getElementById('startPilotBtn').click();
    return true;
  })()`);
  await waitFor(
    `document.getElementById('pilotSetupCard')?.classList.contains('hidden') &&
     JSON.parse(localStorage.getItem('aktywnik-plus-data-v1')||'{}').profileMode==='family'`,
    'family onboarding'
  );

  await evaluate(`(()=>{
    const activity=[...document.querySelectorAll('.activity')].find(el=>el.textContent.includes('Spacer'));
    if(!activity)throw new Error('Spacer activity missing');
    activity.click();
    return true;
  })()`);
  await waitFor("!document.getElementById('entryCard')?.classList.contains('hidden')",'activity form');

  await evaluate(`(()=>{
    document.getElementById('activityDuration').value='25';
    const fatigue=document.getElementById('activityEffort');
    fatigue.value='4';
    fatigue.dispatchEvent(new Event('input',{bubbles:true}));
    fatigue.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  const selectedFatigue=await evaluate("document.getElementById('activityEffortValue')?.textContent?.trim()");
  assert(selectedFatigue==='4/5','selected fatigue value is not shown as 4/5');

  await evaluate("document.getElementById('saveEntryBtn').click(); true");
  await waitFor(
    "document.getElementById('childEntries')?.textContent.includes('zmęczenie 4/5')",
    'saved child entry'
  );
  const childText=String(await evaluate("document.getElementById('childEntries')?.textContent||''")).toLowerCase();
  assert(!childText.includes('obciążenie wysiłkiem'),'parent-only movement load leaked into child view');
  assert(!childText.includes('kcal'),'calorie text leaked into child view');

  await evaluate("document.getElementById('parentAccessBtn').click(); true");
  await waitFor("!!document.getElementById('parentPinInput')",'parent PIN gate');
  await evaluate(`(()=>{
    document.getElementById('parentPinInput').value='2468';
    document.getElementById('unlockParentBtn').click();
    return true;
  })()`);
  await waitFor("!document.getElementById('parentPanel')?.classList.contains('hidden')",'parent unlock');

  await waitFor(
    "document.getElementById('approvalList')?.textContent.toLowerCase().includes('obciążenie wysiłkiem')",
    'parent-only movement load'
  );
  const parentText=String(await evaluate("document.getElementById('approvalList')?.textContent||''")).toLowerCase();
  assert(parentText.includes('zmęczenie 4/5'),'parent approval does not show fatigue 4/5');
  assert(parentText.includes('tylko strefa rodzica'),'parent-only privacy marker missing');
  assert(!parentText.includes('kcal'),'calorie text present in parent approval');

  console.log(JSON.stringify({
    ok:true,
    version:'0.5.0-beta.4',
    familyOnboarding:true,
    fatigueScale:true,
    childBoundary:true,
    parentBoundary:true
  },null,2));
  ws.close();
  process.exit(0);
}catch(err){
  console.error(err);
  ws.close();
  process.exit(1);
}
