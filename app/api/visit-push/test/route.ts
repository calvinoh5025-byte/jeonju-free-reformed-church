import { freeBoardServiceRest } from "../../../../lib/free-board-moderation";
import { clientIp, sameOrigin } from "../../../../lib/visit-auth";
import { sendPush, takeLimit, validEndpoint, type PushSub } from "../../../../lib/visit-push";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// 시험 알림: 알림을 신청한 기기에 "알림이 잘 설정되었습니다"를 한 번 보내 봅니다. (신청한 본인 기기에만 보내집니다)
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  let data: { endpoint?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validEndpoint(data?.endpoint)) return json({ error: "알림 정보를 확인해 주세요." }, 400);
  try {
    if (!(await takeLimit(`test:${clientIp(request)}`, 5, 10 * 60 * 1000))) return json({ error: "시험 알림은 10분에 5번까지 보낼 수 있습니다." }, 429);
    const found = await freeBoardServiceRest(`frck_visit_push_subscriptions?select=id,endpoint,p256dh,auth,kinds,failures&endpoint=eq.${encodeURIComponent(data.endpoint as string)}&limit=1`, { headers: { Accept: "application/json" } });
    if (!found.ok) throw new Error(`lookup failed ${found.status}`);
    const sub = ((await found.json()) as PushSub[])[0];
    if (!sub) return json({ error: "먼저 알림을 신청해 주세요." }, 404);
    const result = await sendPush(sub, { title: "자유개혁교회 심방 일정", body: "알림이 잘 설정되었습니다. 심방 일정이 있으면 전날 저녁과 당일 아침에 알려 드립니다.", url: "/visits", tag: "visit-test" });
    return result.ok ? json({ ok: true }) : json({ error: "알림을 보내지 못했습니다. 알림을 껐다가 다시 켜 보세요." }, 502);
  } catch (error) {
    console.error("[visit-push] test failed", error instanceof Error ? error.message : error);
    return json({ error: "시험 알림을 보내지 못했습니다." }, 503);
  }
}
