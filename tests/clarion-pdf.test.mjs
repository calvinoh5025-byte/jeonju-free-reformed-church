import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/clarion-pdf/route.ts';

// 2026-11-20: 클라리온 출판사 허락 전까지 PDF를 대신 불러오지 않는다. 어떤 주소로 요청해도 410이어야 하고, 바깥 사이트에 요청을 보내면 안 된다.
const request = url => new Request('https://church.test/api/clarion-pdf?url='+encodeURIComponent(url));
test('PDF proxy is disabled and never fetches Clarion', async () => {
  const original=globalThis.fetch;
  let called=false;
  globalThis.fetch=async () => { called=true; return new Response('%PDF-test'); };
  try {
    for (const url of ['https://clarionmagazine.ca/archives/2024/V73_Index2024.pdf', 'https://example.com/a.pdf', '']) {
      const result=await GET(request(url));
      assert.equal(result.status,410);
      assert.notEqual(result.headers.get('content-type'),'application/pdf');
    }
    assert.equal(called,false);
  } finally {globalThis.fetch=original;}
});
