// 2026-11-20 중단: 클라리온 출판사(Premier Printing Ltd.)는 서면 허락 없는 복제를 금지한다고 밝히고 있다.
// 허락 요청 메일을 보낸 상태이며, 허락이 확인될 때까지 PDF를 대신 불러오지 않고 원문 사이트로만 연결한다.
// 허락을 받으면 아래 [원래 코드]를 되살린다. (허락 문서는 출처 확인표에 보관)
export async function GET() {
  return new Response('클라리온 PDF는 저작권 문제로 이 사이트에서 대신 보여 드리지 않습니다. clarionmagazine.ca의 원문을 이용해 주세요.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/* [원래 코드] 허락 확인 후 복원용
const MAX_BYTES = 20 * 1024 * 1024;
export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('url');
  let url: URL;
  try { url = new URL(value ?? ''); } catch { return new Response('잘못된 PDF 주소입니다.', { status: 400 }); }
  if (url.protocol !== 'https:' || url.hostname !== 'clarionmagazine.ca' || url.port || url.username || url.password || url.search || !/^\/archives\/[0-9]{4}\/[a-zA-Z0-9_.-]+\.pdf$/i.test(url.pathname)) {
    return new Response('클라리온 공식 보관 자료만 열 수 있습니다.', { status: 400 });
  }
  try {
    const result = await fetch(url.href, { redirect: 'manual', signal: AbortSignal.timeout(25000) });
    if (!result.ok || !result.body) return new Response('원문 PDF를 가져오지 못했습니다. 원문 링크를 이용해 주세요.', { status: 502 });
    if (Number(result.headers.get('content-length')) > MAX_BYTES) {
      await result.body.cancel();
      return new Response('20MB를 넘는 PDF는 원문을 내려받아 문서 번역을 이용해 주세요.', { status: 413 });
    }
    let bytes = 0;
    const limited = result.body.pipeThrough(new TransformStream({ transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > MAX_BYTES) throw new Error('PDF size limit exceeded');
      controller.enqueue(chunk);
    }}));
    return new Response(limited, { headers: { 'content-type': 'application/pdf', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } });
  } catch { return new Response('PDF 연결이 지연되고 있습니다. 원문 링크를 이용해 주세요.', { status: 502 }); }
}
*/
