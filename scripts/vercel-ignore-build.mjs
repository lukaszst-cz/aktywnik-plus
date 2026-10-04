import {spawnSync} from 'node:child_process';

const previous=String(process.env.VERCEL_GIT_PREVIOUS_SHA||'').trim();
if(!previous){
  console.log('Vercel build gate: no previous deployment SHA -> build');
  process.exit(1);
}

const ignored=[
  ':(exclude).github/**',
  ':(exclude)docs/**',
  ':(exclude)tests/**',
  ':(exclude)backend/tests/**',
  ':(exclude)README.md',
  ':(exclude)CHANGELOG.md'
];

const result=spawnSync('git',['diff','--quiet',previous,'HEAD','--','.',...ignored],{stdio:'inherit'});
if(result.status===0){
  console.log('Vercel build gate: only non-runtime files changed -> skip build');
  process.exit(0);
}
console.log('Vercel build gate: runtime/config changed -> build');
process.exit(1);
