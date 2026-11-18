import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/clarion-pdf/route.ts';

const request = url => new Request('https://church.test/api/clarion-pdf?url='+encodeURIComponent(url));
test('PDF proxy rejects other hosts, credentials and non-archive paths before fetching', async () => {
  for (const url of ['https://example.com/a.pdf', 'https://clarionmagazine.ca.evil.test/archives/2024/a.pdf', 'http://clarionmagazine.ca/archives/2024/a.pdf', 'https://user:pass@clarionmagazine.ca/archives/2024/a.pdf', 'https://clarionmagazine.ca/private.pdf', 'https://clarionmagazine.ca/archives/2024/a.pdf?target=private']) {
    assert.equal((await GET(request(url))).status,400);
  }
});
test('PDF proxy serves allowed PDFs and refuses redirects and oversized files', async () => {
  const original=globalThis.fetch;
  try {
    const url='https://clarionmagazine.ca/archives/2024/V73_Index2024.pdf';
    globalThis.fetch=async (_,options) => { assert.equal(options.redirect,'manual'); return new Response('%PDF-test'); };
    let result=await GET(request(url)); assert.equal(result.status,200); assert.equal(await result.text(),'%PDF-test');
    globalThis.fetch=async () => new Response(null,{status:302,headers:{location:'http://localhost/'}});
    assert.equal((await GET(request(url))).status,502);
    globalThis.fetch=async () => new Response('large',{headers:{'content-length':String(21*1024*1024)}});
    assert.equal((await GET(request(url))).status,413);
    globalThis.fetch=async () => new Response(new Uint8Array(21*1024*1024));
    result=await GET(request(url)); await assert.rejects(()=>result.arrayBuffer());
  } finally {globalThis.fetch=original;}
});
