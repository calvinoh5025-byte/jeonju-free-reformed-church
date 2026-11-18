export async function GET(request: Request) {
  const id=new URL(request.url).searchParams.get('id');
  if (!id || !/^[1-9][0-9]{0,5}$/.test(id)) return Response.json({error:'잘못된 설교 번호입니다.'},{status:400});
  try {
    const response=await fetch(`https://theseed.info/sermon.php?id=${id}`,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    if (!response.ok || !response.body) throw new Error('Source unavailable');
    const reader=response.body.getReader(), chunks:Uint8Array[]=[]; let bytes=0;
    while(true) {const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2*1024*1024){await reader.cancel();throw new Error('Source too large');}chunks.push(value);}
    const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
    return Response.json({html:new TextDecoder().decode(buffer)},{headers:{'cache-control':'public, max-age=3600'}});
  } catch {return Response.json({error:'설교 본문을 불러오지 못했습니다. 원문 링크를 이용해 주세요.'},{status:502});}
}
