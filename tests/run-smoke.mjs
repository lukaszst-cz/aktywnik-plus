const port=process.argv[2]||'9222';
const targetPrefix=process.argv[3]||'http://127.0.0.1:8765/tests/smoke.html';
const deadline=Date.now()+30000;

async function waitForPage(){
  while(Date.now()<deadline){
    try{
      const list=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      const page=list.find(x=>x.type==='page'&&x.url.startsWith(targetPrefix));
      if(page)return page;
    }catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('Chrome DevTools page not found');
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

while(Date.now()<deadline){
  const response=await call('Runtime.evaluate',{
    expression:"({test:document.body.dataset.test||'',result:document.getElementById('result')?.textContent||''})",
    returnByValue:true
  });
  const value=response.result?.result?.value||{};
  if(value.test){
    console.log(value.result);
    ws.close();
    process.exit(value.test==='pass'?0:1);
  }
  await new Promise(r=>setTimeout(r,250));
}
console.error('Smoke test timed out without pass/fail state.');
ws.close();
process.exit(2);
