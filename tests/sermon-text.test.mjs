import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/sermon-text/route.ts';
test('sermon fetch accepts numeric IDs only and rejects redirects and large responses',async()=>{
  const original=globalThis.fetch;
  const request=id=>new Request('https://church.test/api/sermon-text?id='+encodeURIComponent(id));
  try{
    for(const id of ['','-1','1&host=evil','https://example.com','9999999'])assert.equal((await GET(request(id))).status,400);
    globalThis.fetch=async(url,options)=>{assert.equal(url,'https://theseed.info/sermon.php?id=3356');assert.equal(options.redirect,'manual');return new Response('<div>text</div>');};
    assert.equal((await (await GET(request('3356'))).json()).html,'<div>text</div>');
    globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'http://localhost'}});
    assert.equal((await GET(request('3356'))).status,502);
    globalThis.fetch=async()=>new Response(new Uint8Array(3*1024*1024));
    assert.equal((await GET(request('3356'))).status,502);
  }finally{globalThis.fetch=original;}
});
