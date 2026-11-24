import { freeBoardServiceRest } from "../../../lib/free-board-moderation";

// Supabase 무료 프로젝트가 오래 쓰이지 않아 멈추는 것을 막기 위해,
// Vercel이 정해진 날마다 이 주소를 불러 DB를 한 번 읽습니다. (vercel.json의 crons 참고)
// 글 내용은 읽지 않고 id 한 개만 확인하므로 전송량은 거의 없습니다.
export async function GET(request: Request) {
  // CRON_SECRET을 Vercel 환경 변수에 넣어 두면 Vercel이 자동으로 인증 헤더를 붙입니다.
  // 설정되어 있으면 그 헤더가 맞는 요청만 받습니다.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const response = await freeBoardServiceRest("frck_free_posts?select=id&limit=1", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[keepalive] supabase ping failed", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
