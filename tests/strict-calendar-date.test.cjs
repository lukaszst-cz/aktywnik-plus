'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=source.indexOf('function validDate(v){');
const end=source.indexOf('\nfunction allowedActivityDate(',start);
assert.ok(start>=0&&end>start,'validDate function must be present');
const validDate=vm.runInNewContext(source.slice(start,end)+'\nvalidDate');
for(const value of ['2024-02-29','2026-02-28','2026-12-31','2000-02-29','0001-01-01']){
  assert.equal(validDate(value),true,'valid date: '+value);
}
for(const value of ['2026-02-29','2026-02-30','2026-04-31','2026-13-01','2026-00-10','2026-01-00','1900-02-29','2026-12-32','2026-1-01','2026-01-1','not-a-date','',null]){
  assert.equal(validDate(value),false,'invalid date: '+value);
}
console.log('PASS: strict calendar dates for diary and import');
