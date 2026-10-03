const base=(process.env.AKTYWNIK_BASE_URL || 'https://aktywnik-plus.vercel.app').replace(/\/$/,'');
const expected=process.env.AKTYWNIK_EXPECTED_VERSION || '0.5.0-beta.3';
const requireCloud=String(process.env.AKTYWNIK_REQUIRE_CLOUD || 'true').toLowerCase()==='true';

async function request(path,options={}){
  const res=await fetch(base+path,{
    ...options,
    headers:{'cache-control':'no-cache',...(options.headers||{})}
  });
  const text=await res.text();
  return {res,text};
}

async function get(path){
  const out=await request(path);
  if(!out.res.ok) throw new Error(`${path} HTTP ${out.res.status}: ${out.text.slice(0,240)}`);
  return out;
}

function requireHeader(res,name,expectedValue=null){
  const value=res.headers.get(name);
  if(!value) throw new Error(`${name} missing`);
  if(expectedValue!==null && !String(value).toLowerCase().includes(String(expectedValue).toLowerCase())){
    throw new Error(`${name} unexpected: ${value}`);
  }
  return value;
}

async function expectStatus(path,status,options={}){
  const out=await request(path,options);
  if(out.res.status!==status) throw new Error(`${path} HTTP ${out.res.status} != expected ${status}`);
  return out;
}

const root=await get('/');
if(!/Aktywnik\+/.test(root.text)) throw new Error('landing page marker missing');
requireHeader(root.res,'strict-transport-security');
requireHeader(root.res,'content-security-policy');
requireHeader(root.res,'x-frame-options','deny');
requireHeader(root.res,'x-content-type-options','nosniff');
requireHeader(root.res,'referrer-policy','strict-origin');
const permissions=requireHeader(root.res,'permissions-policy');
for(const denied of ['geolocation=()','camera=()','microphone=()']){
  if(!permissions.includes(denied)) throw new Error(`Permissions-Policy missing ${denied}`);
}

const manifestRaw=await get('/manifest.webmanifest');
requireHeader(manifestRaw.res,'content-type','application/manifest+json');
requireHeader(manifestRaw.res,'cache-control','must-revalidate');
const manifest=JSON.parse(manifestRaw.text);
if(manifest.name!=='Aktywnik+' || manifest.short_name!=='Aktywnik+') throw new Error('PWA manifest name mismatch');
if(manifest.start_url!=='./app.html' || manifest.display!=='standalone') throw new Error('PWA manifest launch settings mismatch');
if(!Array.isArray(manifest.icons) || manifest.icons.length<2) throw new Error('PWA manifest icons missing');

const sw=await get('/sw.js');
requireHeader(sw.res,'service-worker-allowed','/');
requireHeader(sw.res,'cache-control','must-revalidate');
for(const asset of ['./app.html','./app.js','./family-sync-client.js','./manifest.webmanifest']){
  if(!sw.text.includes(asset)) throw new Error(`service worker precache missing ${asset}`);
}
if(!sw.text.includes("url.pathname.startsWith('/api/')")) throw new Error('service worker API bypass missing');

const healthRaw=await get('/api/health');
requireHeader(healthRaw.res,'cache-control','no-store');
requireHeader(healthRaw.res,'x-robots-tag','noindex');
const health=JSON.parse(healthRaw.text);
if(health.version!==expected) throw new Error(`production version ${health.version} != expected ${expected}`);
if(health.backend!=='full-family-sync-pilot') throw new Error(`unexpected backend stage: ${health.backend}`);

const capsRaw=await get('/api/capabilities');
requireHeader(capsRaw.res,'cache-control','no-store');
const caps=JSON.parse(capsRaw.text);
if(caps?.cloud?.familySyncProtocolVersion!==1) throw new Error('family sync protocol v1 missing');
if(caps?.cloud?.applicationRestoreDrillVerified!==true) throw new Error('restore drill capability missing');
if(caps?.cloud?.profileRoleEscalationBlocked!==true) throw new Error('profile role hardening missing');
if(caps?.cloud?.publicSecurityDefinerRpcSurface!==false) throw new Error('public SECURITY DEFINER surface must be false');

if(requireCloud){
  const c=caps?.cloud||{};
  const required=[
    ['enabled',c.enabled],
    ['databaseConfigured',c.databaseConfigured],
    ['authenticationConfigured',c.authenticationConfigured],
    ['rowLevelSecurityVerified',c.rowLevelSecurityVerified],
    ['familySync',c.familySync],
    ['familySyncDeletes',c.familySyncDeletes],
    ['familySyncDecisionHistory',c.familySyncDecisionHistory],
    ['familyCloudOnboarding',c.familyCloudOnboarding],
  ];
  const failed=required.filter(([,v])=>v!==true).map(([k])=>k);
  if(failed.length) throw new Error('production cloud gate not ready: '+failed.join(', '));
}

await expectStatus('/api/health',405,{method:'POST'});
await expectStatus('/api/v1/me',401);
await expectStatus('/api/v1/classes',401);
await expectStatus('/api/v1/family-children',401,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:'{}'
});

console.log(JSON.stringify({
  ok:true,
  base,
  version:health.version,
  backend:health.backend,
  cloudEnabled:caps?.cloud?.enabled===true,
  familySync:caps?.cloud?.familySync===true,
  familySyncDeletes:caps?.cloud?.familySyncDeletes===true,
  familySyncDecisionHistory:caps?.cloud?.familySyncDecisionHistory===true,
  pwaManifest:true,
  serviceWorkerPrecache:true,
  securityHeaders:true,
  authGuards:true
},null,2));
