const base=(process.env.AKTYWNIK_BASE_URL || 'https://aktywnik-plus.vercel.app').replace(/\/$/,'');
const expected=process.env.AKTYWNIK_EXPECTED_VERSION || '0.5.0-beta.3';
const requireCloud=String(process.env.AKTYWNIK_REQUIRE_CLOUD || 'true').toLowerCase()==='true';

async function get(path){
  const res=await fetch(base+path,{headers:{'cache-control':'no-cache'}});
  const text=await res.text();
  if(!res.ok) throw new Error(`${path} HTTP ${res.status}: ${text.slice(0,240)}`);
  return {res,text};
}

const root=await get('/');
if(!/Aktywnik\+/.test(root.text)) throw new Error('landing page marker missing');
if(!root.res.headers.get('strict-transport-security')) throw new Error('HSTS missing');
if(!root.res.headers.get('content-security-policy')) throw new Error('CSP missing');

const healthRaw=await get('/api/health');
const health=JSON.parse(healthRaw.text);
if(health.version!==expected) throw new Error(`production version ${health.version} != expected ${expected}`);
if(health.backend!=='full-family-sync-pilot') throw new Error(`unexpected backend stage: ${health.backend}`);

const capsRaw=await get('/api/capabilities');
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

console.log(JSON.stringify({
  ok:true,
  base,
  version:health.version,
  backend:health.backend,
  cloudEnabled:caps?.cloud?.enabled===true,
  familySync:caps?.cloud?.familySync===true,
  familySyncDeletes:caps?.cloud?.familySyncDeletes===true,
  familySyncDecisionHistory:caps?.cloud?.familySyncDecisionHistory===true
},null,2));
