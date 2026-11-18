import * as pdfjs from '/pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
const $ = id => document.getElementById(id);
let pdf, current = 1, sequence = 0;
const params = new URLSearchParams(location.search);
const source = params.get('url');
$('document-title').textContent = params.get('title') || '클라리온';
function parts(text) {
  const result = []; let section = '';
  for (const word of text.split(/\s+/)) {
    if ((section + ' ' + word).length > 3500 && section) { result.push(section); section = ''; }
    // Very long unspaced runs are split too, to keep translation links bounded.
    if (word.length > 3500) { if (section) { result.push(section); section = ''; } for (let i=0;i<word.length;i+=3500) result.push(word.slice(i,i+3500)); }
    else section += (section ? ' ' : '') + word;
  }
  if (section) result.push(section);
  return result;
}
async function render(number) {
  const token = ++sequence; current = number;
  $('pdf-page').value = number;
  $('pdf-text').replaceChildren();
  $('pdf-status').textContent = `${number}페이지 본문을 읽는 중입니다…`;
  $('pdf-prev').disabled = number <= 1; $('pdf-next').disabled = number >= pdf.numPages;
  try {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    if (token !== sequence) return;
    const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
    if (!text) { $('pdf-status').textContent = '이 페이지는 추출할 수 있는 본문이 없습니다. 이미지 스캔본이라면 OCR 후 번역해야 합니다.'; return; }
    parts(text).forEach((part,index) => {
      const section = document.createElement('section'); section.className = 'pdf-part';
      const heading = document.createElement('h2'); heading.textContent = `${number}페이지 · 본문 ${index + 1}`;
      const p = document.createElement('p'); p.textContent = part; p.lang = 'en';
      const link = document.createElement('a'); link.className = 'translate-link'; link.textContent = '이 부분 한국어로 번역 ↗'; link.target = '_blank'; link.rel = 'noopener';
      link.href = 'https://translate.google.com/?sl=en&tl=ko&op=translate&text=' + encodeURIComponent(part);
      const papago=document.createElement('a'); papago.className='translate-link'; papago.textContent='Papago로 번역 ↗'; papago.target='_blank'; papago.rel='noopener'; papago.href='https://papago.naver.com/?sk=en&tk=ko&st='+encodeURIComponent(part);
      section.append(heading,link,document.createTextNode(' '),papago,p); $('pdf-text').append(section);
    });
    $('pdf-status').textContent = `${number} / ${pdf.numPages}페이지 · 본문을 추출했습니다. 번역 버튼을 누르면 해당 본문이 Google 번역으로 전달됩니다.`;
  } catch { if (token === sequence) $('pdf-status').textContent = '이 페이지의 본문을 읽지 못했습니다. 다른 페이지 또는 원문 PDF를 이용해 주세요.'; }
}
$('pdf-prev').onclick = () => render(Math.max(1,current-1));
$('pdf-next').onclick = () => render(Math.min(pdf.numPages,current+1));
$('pdf-page').onchange = () => { const n=Number($('pdf-page').value); if (Number.isInteger(n)&&n>=1&&n<=pdf.numPages) render(n); else $('pdf-page').value=current; };
try {
  const url = new URL(source || '');
  if (url.protocol !== 'https:' || url.hostname !== 'clarionmagazine.ca' || url.username || url.password || url.port || !url.pathname.toLowerCase().endsWith('.pdf')) throw new Error('Invalid PDF');
  $('pdf-original').href = url.href;
  pdf = await pdfjs.getDocument({ url: '/api/clarion-pdf?url='+encodeURIComponent(url.href), cMapUrl:'/pdfjs/cmaps/', cMapPacked:true, standardFontDataUrl:'/pdfjs/standard_fonts/', isEvalSupported:false }).promise;
  $('pdf-total').textContent = `/ ${pdf.numPages}페이지`;
  $('pdf-page').max = pdf.numPages; $('pdf-page').disabled = false;
  await render(1);
} catch { $('pdf-status').textContent = 'PDF 본문을 불러오지 못했습니다. 아래 원문 PDF와 Google 문서 번역을 이용해 주세요.'; }
