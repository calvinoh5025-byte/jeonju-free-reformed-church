'use strict';
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id');
function sections(text){const words=text.split(/\s+/),parts=[];let part='';for(const word of words){if((part+' '+word).length>3000&&part){parts.push(part);part='';}if(word.length>3000){if(part){parts.push(part);part='';}for(let i=0;i<word.length;i+=3000)parts.push(word.slice(i,i+3000));}else part+=(part?' ':'')+word;}if(part)parts.push(part);return parts;}
async function load(){
  if(!id||!/^[1-9][0-9]{0,5}$/.test(id)){$('sermon-status').textContent='잘못된 설교 번호입니다.';return;}
  $('sermon-original').href='https://theseed.info/sermon.php?id='+id;
  try{
    const response=await fetch('/api/sermon-text?id='+id),data=await response.json();
    if(!response.ok)throw new Error(data.error);
    const doc=new DOMParser().parseFromString(data.html,'text/html');
    const content=doc.querySelector('#contentRight .contentBody');
    if(!content)throw new Error('본문을 찾지 못했습니다. 영문 원문을 이용해 주세요.');
    $('sermon-title').textContent=(doc.title||'설교').replace(/^TheSeed.info\s*-\s*/,'');
    content.querySelectorAll('script,style,table,.footprint,form,iframe,img,object,embed').forEach(node=>node.remove());
    const text=content.textContent.replace(/\s+/g,' ').trim();
    if(text.length<100)throw new Error('번역할 설교 본문이 없습니다. 영문 원문을 이용해 주세요.');
    sections(text).forEach((part,index)=>{
      const section=document.createElement('section');section.className='pdf-part';
      const heading=document.createElement('h2');heading.textContent='본문 '+(index+1);
      const p=document.createElement('p');p.lang='en';p.textContent=part;
      const google=document.createElement('a');google.className='translate-link';google.textContent='한국어로 번역 ↗';google.target='_blank';google.rel='noopener';google.href='https://translate.google.com/?sl=en&tl=ko&op=translate&text='+encodeURIComponent(part);
      const papago=document.createElement('a');papago.className='translate-link';papago.textContent='Papago로 번역 ↗';papago.target='_blank';papago.rel='noopener';papago.href='https://papago.naver.com/?sk=en&tk=ko&st='+encodeURIComponent(part);
      section.append(heading,google,document.createTextNode(' '),papago,p);$('sermon-text').append(section);
    });
    $('sermon-status').textContent='본문을 불러왔습니다. 번역 버튼을 누르면 해당 본문이 선택한 번역 서비스로 전달됩니다.';
  }catch(error){$('sermon-status').textContent=error.message||'본문을 불러오지 못했습니다. 영문 원문을 이용해 주세요.';}
}
load();
