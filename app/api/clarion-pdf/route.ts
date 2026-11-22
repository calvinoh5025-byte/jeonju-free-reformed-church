const MAX_BYTES = 20 * 1024 * 1024;
const requests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

export async function GET(request: Request) {
  // 인스턴스 메모리 제한이므로 서버리스 인스턴스별로 횟수가 분리될 수 있습니다.
  const ip = request.headers.get("x-real-ip")?.trim() || "unknown";
  const now = Date.now();
  for (const [key, timestamps] of requests) {
    const active = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (active.length) requests.set(key, active);
    else requests.delete(key);
  }
  const recent = requests.get(ip) ?? [];
  if (recent.length === 0) requests.delete(ip);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return new Response('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', { status: 429 });
  }
  recent.push(now);
  requests.set(ip, recent);

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
