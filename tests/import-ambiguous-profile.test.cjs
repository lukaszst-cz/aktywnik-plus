'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function importer(children) {
  const context = {
    state: {children},
    window: {},
    document: {readyState: 'loading', addEventListener() {}},
    localToday: () => '2026-11-09',
    console
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'app-import.js'), 'utf8'), context);
  return context.window.AktywnikTableImport;
}
const row = (profile) => ({profile, date:'2026-11-08', activity:'Basen', minutes:45, effort:2, note:'', line:2});
test('explicit duplicate display names cannot select a sibling', () => {
  const children=[{id:'a',displayName:'Jan Kowalski'},{id:'b',displayName:'Jan Kowalski'}];
  const result=importer(children).previewRows([row('Jan Kowalski')],children[0],[]);
  assert.equal(result.entries.length,0);
  assert.equal(result.errors.length,1);
  assert.match(result.errors[0],/niejednoznaczna/);
});
test('unique explicit profile is assigned to selected child ID', () => {
  const children=[{id:'a',displayName:'Jan Kowalski'},{id:'b',displayName:'Anna Kowalska'}];
  const result=importer(children).previewRows([row('Jan Kowalski')],children[0],[]);
  assert.equal(result.entries.length,1);
  assert.equal(result.entries[0].childId,'a');
});
test('explicit different profile is skipped, not reassigned', () => {
  const children=[{id:'a',displayName:'Jan Kowalski'},{id:'b',displayName:'Anna Kowalska'}];
  const result=importer(children).previewRows([row('Anna Kowalska')],children[0],[]);
  assert.equal(result.entries.length,0);
  assert.equal(result.otherProfile,1);
});
test('missing profile column retains explicit selected-profile import behavior', () => {
  const children=[{id:'a',displayName:'Jan Kowalski'},{id:'b',displayName:'Jan Kowalski'}];
  const result=importer(children).previewRows([row('')],children[0],[]);
  assert.equal(result.entries.length,1);
  assert.equal(result.entries[0].childId,'a');
});
