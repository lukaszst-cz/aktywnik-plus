import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync(new URL('../notion-handoff.js',import.meta.url),'utf8');
const events=new Map();
const window={
  addEventListener:(name,callback)=>events.set(name,callback),
  AktywnikMotivationBridge:{
    snapshot:()=>({child:{id:'test-child',notionUrl:'https://app.notion.com/p/abc'}})
  }
};
const document={readyState:'loading',addEventListener(){},getElementById(){return null}};
vm.runInNewContext(script,{window,document,URL,Number,String,Math,navigator:{}},{filename:'notion-handoff.js'});
const tool=window.AktywnikNotionHandoff;
assert.equal(tool.urlSafe('https://app.notion.com/p/abc'),'https://app.notion.com/p/abc');
assert.equal(tool.urlSafe('https://www.notion.so/a'),'https://www.notion.so/a');
assert.equal(tool.urlSafe('https://notion.so/a'),'https://notion.so/a');
assert.equal(tool.urlSafe('javascript:alert(1)'),null);
assert.equal(tool.urlSafe('https://notion.so.evil.example/a'),null);
assert.equal(tool.urlSafe('https://example.com/'),null);
const note=tool.entryText({date:'2026-11-02',activity:'Judo',minutes:45,status:'pending',source:'timer',note:'Trening'});
assert.ok(note.includes('Judo'));
assert.ok(note.includes('45 min'));
assert.ok(note.includes('Oczekuje na zatwierdzenie rodzica'));
assert.ok(note.includes('Start/Stop'));
assert.ok(note.includes('Trening'));
assert.equal(events.has('aktywnik:entrysaved'),true);
assert.equal(/fetch\s*\(/.test(script),false,'Client must not upload directly to an external service');
console.log('PASS: secure Notion URL validation, copy formatting and manual-only transport');
