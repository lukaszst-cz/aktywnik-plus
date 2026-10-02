'use strict';

function rows(from,to){
  return Array.from({length:to-from+1},(_,i)=>
    '<tr><td>'+(from+i)+'</td><td></td><td></td><td></td><td></td><td></td></tr>'
  ).join('');
}

document.addEventListener('DOMContentLoaded',()=>{
  const rows1=document.getElementById('rows1');
  const rows2=document.getElementById('rows2');
  const printBtn=document.getElementById('printPaperBtn');
  if(rows1)rows1.innerHTML=rows(1,35);
  if(rows2)rows2.innerHTML=rows(36,70);
  if(printBtn)printBtn.addEventListener('click',()=>window.print());
});
