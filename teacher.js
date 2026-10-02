'use strict';

const teacherUrl='https://aktywnik-plus.vercel.app';

async function copyText(value,message){
  const status=document.getElementById('teacherShareStatus');
  try{
    await navigator.clipboard.writeText(value);
    if(status)status.textContent=message;
  }catch{
    if(status)status.textContent='Skopiuj ręcznie: '+value;
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  const linkBtn=document.getElementById('copyTeacherLink');
  const messageBtn=document.getElementById('copyTeacherMessage');
  const message=document.getElementById('teacherShareMessage');
  if(linkBtn)linkBtn.addEventListener('click',()=>copyText(teacherUrl,'Link skopiowany.'));
  if(messageBtn&&message)messageBtn.addEventListener('click',()=>copyText(message.value,'Wiadomość do rodziców skopiowana.'));
});
