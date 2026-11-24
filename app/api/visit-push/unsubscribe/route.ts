import { freeBoardServiceRest } from "../../../../lib/free-board-moderation";
import { clientIp, sameOrigin } from "../../../../lib/visit-auth";
import { takeLimit, validEndpoint } from "../../../../lib/visit-push";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// 알림 끄기: 그 기기의 알림 주소를 바로 삭제합니다.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  let data: { endpoint?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validEndpoint(data?.endpoint)) return json({ error: "알림 정보를 확인해 주세요." }, 400);
  try {
    if (!(await takeLimit(`ip:${clientIp(request)}`, 20, 10 * 60 * 1000))) return json({ error: "잠시 후 다시 시도해 주세요." }, 429);
    const response = await freeBoardServiceRest(`frck_visit_push_subscriptions?endpoint=eq.${encodeURIComponent(data.endpoint as string)}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`delete failed ${response.status}`);
    return json({ ok: true });
  } catch (error) {
    console.error("[visit-push] unsubscribe failed", error instanceof Error ? error.message : error);
    return json({ error: "알림을 끄지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
