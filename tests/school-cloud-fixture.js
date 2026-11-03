/* Browser-only School Cloud fixture. All requests are intercepted. Never connects to Supabase. */
(function(){
'use strict';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const A1='11111111-1111-4111-8111-111111111111';
const B1='22222222-2222-4222-8222-222222222222';
const B2='33333333-3333-4333-8333-333333333333';
window.__schoolFixture={A,B,A1,B1,B2,requests:[],aClassDelay:120,meLoads:0};
window.AktywnikAuth={validSession:async()=>({access_token:'local-test-token'})};
const wait=ms=>new Promise(done=>setTimeout(done,ms));
function respond(body,status=200){
 return {ok:status>=200&&status<300,status,async json(){return body}};
}
window.fetch=async(request,init={})=>{
 const path=typeof request==='string'?request:request.url;
 const req=window.__schoolFixture;
 req.requests.push({path,method:init.method||'GET'});
 if(path==='/api/v1/me'){
  req.meLoads++;
  await wait(9);
  return respond({ok:true,profile:{display_name:'Test nauczyciel',profile_type:'adult'},
    memberships:[{tenant_id:A,role:'teacher',active:true},{tenant_id:B,role:'school_admin',active:true}],
    children:[]});
 }
 if(path.startsWith('/api/v1/school-years?')){
  const id=new URLSearchParams(path.split('?')[1]).get('tenantId');
  await wait(id===A?req.aClassDelay:10);
  return respond({ok:true,schoolYears:[
   {id:'10000000-0000-4000-8000-000000000000',tenant_id:A,label:'2026/2027'},
   {id:'20000000-0000-4000-8000-000000000000',tenant_id:B,label:'2026/2027'}
  ].filter(x=>x.tenant_id===id)});
 }
 if(path==='/api/v1/classes' && (init.method||'GET')==='GET'){
  await wait(req.requests.filter(r=>r.path==='/api/v1/classes').length===1?req.aClassDelay:15);
  return respond({ok:true,classes:[
   {id:A1,tenant_id:A,school_year_id:'10000000-0000-4000-8000-000000000000',name:'4A',archived_at:null},
   {id:B1,tenant_id:B,school_year_id:'20000000-0000-4000-8000-000000000000',name:'5A',archived_at:null},
   {id:B2,tenant_id:B,school_year_id:'20000000-0000-4000-8000-000000000000',name:'6B',archived_at:null}
  ]});
 }
 if(path==='/api/v1/class-invites' && init.method==='POST'){
  const payload=JSON.parse(init.body);
  return respond({ok:true,token:'44444444-4444-4444-8444-444444444444',classId:payload.classId},201);
 }
 if(path.startsWith('/api/v1/class-join?')){
  const classId=new URLSearchParams(path.split('?')[1]).get('classId');
  return respond({ok:true,requests:[{id:'55555555-5555-4555-8555-555555555555',class_id:classId,
      child_id:'66666666-6666-4666-8666-666666666666',status:'pending'}]});
 }
 if(path.startsWith('/api/v1/class-join')&&init.method==='POST')return respond({ok:true});
 throw Error('Unexpected school fixture URL: '+path);
};
})();