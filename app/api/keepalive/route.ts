import { freeBoardServiceRest } from "../../../lib/free-board-moderation";

// Supabase 무료 프로젝트가 오래 쓰이지 않아 멈추는 것을 막기 위해,
// (지금은 심방 알림 예약(/api/cron/visit-push)이 매일 DB를 읽어 같은 역할을 하므로 vercel.json에서는 부르지 않습니다. 필요하면 다시 crons에 넣을 수 있습니다.)
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

