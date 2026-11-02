import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../motivation.js',import.meta.url),'utf8');
const window={};
const document={readyState:'loading',addEventListener(){}};
vm.runInNewContext(source,{window,document,Date,Math,String,Number,Set,Object,RegExp},{filename:'motivation.js'});
const {compute,streak,bounds}=window.AktywnikMotivation;
const reference=new Date(2026,10,2,12);
const entries=[
  {childId:'a',date:'2026-11-02',minutes:30,status:'approved'},
  {childId:'a',date:'2026-11-01',minutes:25,status:'pending'},
  {childId:'a',date:'2026-10-31',minutes:45,status:'approved'},
  {childId:'a',date:'2026-10-26',minutes:10,status:'approved'},
  {childId:'a',date:'2026-11-02',minutes:200,status:'rejected'},
  {childId:'b',date:'2026-11-02',minutes:800,status:'approved'}
];
const weekly=compute(entries,'a','7',reference);
assert.equal(weekly.total,30,'This Monday only; rejected not counted');
assert.equal(weekly.previous,10,'Prior period compares matching elapsed days');
assert.equal(weekly.activities,1);
assert.equal(weekly.activeDays,1);
assert.equal(streak(entries,'a',reference),3,'Pending activity keeps a child streak');
assert.equal(streak(entries,'a',new Date(2026,10,4,12)),0,'Missing two days breaks a streak');
assert.equal(compute(entries,'b','7',reference).total,0,'Cross-profile and invalid duration excluded');
for(const p of ['7','14','21','month']){
  const range=bounds(p,reference);
  assert.equal(range.previousEnd.getTime(),range.start.getTime(),'Previous interval ends where current begins');
  assert.ok(range.end>range.start,'positive interval for '+p);
  const result=compute(entries,'a',p,reference);
  assert.ok(Number.isFinite(result.total));
}
const inMonth=compute([
  {childId:'a',date:'2026-11-01',minutes:20,status:'approved'},
  {childId:'a',date:'2026-10-01',minutes:40,status:'approved'},
  {childId:'a',date:'2026-10-02',minutes:30,status:'approved'},
  {childId:'a',date:'2026-10-03',minutes:50,status:'approved'}
],'a','month',reference);
assert.equal(inMonth.total,20);
assert.equal(inMonth.previous,70,'Compare only first two days of last month');
console.log('PASS: weekly, 2/3-week and monthly comparison, streak, role isolation, filtering');
