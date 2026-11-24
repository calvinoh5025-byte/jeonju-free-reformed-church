import { freeBoardServiceRest } from "../../../../lib/free-board-moderation";
import { clientIp, sameOrigin } from "../../../../lib/visit-auth";
import { cleanKinds, takeLimit, validEndpoint, validKey } from "../../../../lib/visit-push";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const MAX_SUBSCRIPTIONS = 3000;

// 알림 신청: 로그인 없이 누구나 할 수 있습니다(성도 포함). 저장하는 것은 기기의 알림 주소뿐이고 이름·이메일·전화번호는 받지 않습니다.
// '내 가정 알림'을 고르면 그 심방 대상자 번호(최대 10개)만 함께 저장합니다.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  let data: { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; kinds?: unknown; target_ids?: unknown; website?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (data?.website) return json({ ok: true }); // 봇이 채우는 숨은 칸
  const sub = data?.subscription;
  if (!sub || !validEndpoint(sub.endpoint) || !validKey(sub.keys?.p256dh, 20, 200) || !validKey(sub.keys?.auth, 10, 100)) return json({ error: "알림 정보를 확인해 주세요." }, 400);
  const wanted = Array.isArray(data.target_ids) ? Array.from(new Set(data.target_ids.filter((n): n is number => Number.isSafeInteger(n) && (n as number) > 0))).slice(0, 10) : [];
  try {
    if (!(await takeLimit(`ip:${clientIp(request)}`, 10, 10 * 60 * 1000))) return json({ error: "잠시 후 다시 시도해 주세요." }, 429);
    const count = await freeBoardServiceRest("frck_visit_push_subscriptions?select=id&limit=1", { headers: { Accept: "application/json", Prefer: "count=exact", Range: "0-0" } });
    const total = Number((count.headers.get("content-range") ?? "").split("/")[1] ?? 0);
    if (Number.isFinite(total) && total >= MAX_SUBSCRIPTIONS) return json({ error: "지금은 알림 신청을 더 받을 수 없습니다. 교회에 알려 주세요." }, 503);
    let targetIds: number[] = [];
    if (wanted.length) {
      const found = await freeBoardServiceRest(`frck_visit_targets?select=id&active=eq.true&id=in.(${wanted.join(",")})&limit=10`, { headers: { Accept: "application/json" } });
      if (!found.ok) throw new Error(`targets status ${found.status}`);
      targetIds = ((await found.json()) as Array<{ id: number }>).map(r => r.id);
      if (!targetIds.length) return json({ error: "선택한 가정을 찾지 못했습니다. 페이지를 새로 고쳐 주세요." }, 400);
    }
    const response = await freeBoardServiceRest("frck_visit_push_subscriptions?on_conflict=endpoint", {
      method: "POST", headers: { "content-type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ endpoint: sub.endpoint, p256dh: sub.keys!.p256dh, auth: sub.keys!.auth, kinds: cleanKinds(data.kinds), target_ids: targetIds, failures: 0 }),
    });
    if (!response.ok) throw new Error(`save failed ${response.status}`);
    return json({ ok: true });
  } catch (error) {
    console.error("[visit-push] subscribe failed", error instanceof Error ? error.message : error);
    return json({ error: "알림을 신청하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
