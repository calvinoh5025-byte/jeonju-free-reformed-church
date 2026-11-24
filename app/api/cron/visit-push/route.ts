import { freeBoardServiceRest } from "../../../../lib/free-board-moderation";
import { addDays, dayEndIso, dayStartIso, kstDateKey, kstHourNow, sendDayReminders, type VisitLite } from "../../../../lib/visit-push";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Vercel이 하루 두 번 부릅니다: 전날 저녁(한국시간 18시, kind=eve) / 당일 아침(7시, kind=morning).
// - CRON_SECRET 환경 변수가 있으면 그 값이 맞는 요청만 받습니다.
// - 없더라도 엉뚱한 시간에 부르면 아무것도 하지 않도록(전날 저녁 17~23시, 당일 아침 6~10시에만 동작) 막아 둡니다.
// - 같은 알림은 두 번 가지 않습니다(보낸 기록으로 중복 방지).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "권한이 없습니다." }, 401);
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "eve" && kind !== "morning") return json({ error: "kind를 확인해 주세요." }, 400);
  const hour = kstHourNow();
  const inWindow = !!process.env.VISIT_PUSH_FAKE_URL || (kind === "eve" ? hour >= 17 && hour <= 23 : hour >= 6 && hour <= 10);
  if (!inWindow) return json({ ok: true, skipped: "지금은 이 알림을 보내는 시간이 아닙니다.", hour });
  try {
    const today = kstDateKey(new Date());
    const day = kind === "eve" ? addDays(today, 1) : today;
    const response = await freeBoardServiceRest(`frck_visits?select=id,starts_at,kind,pastor,status&status=eq.scheduled&starts_at=gte.${encodeURIComponent(dayStartIso(day))}&starts_at=lte.${encodeURIComponent(dayEndIso(day))}&order=starts_at.asc&limit=200`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`visits status ${response.status}`);
    const visits = await response.json() as VisitLite[];
    const result = visits.length ? await sendDayReminders(kind, visits, day) : { subscribers: 0, sent: 0, failed: 0 };
    // 오래된 기록 정리(보낸 기록 90일, 요청 기록 2일)
    await freeBoardServiceRest(`frck_visit_push_deliveries?created_at=lt.${encodeURIComponent(new Date(Date.now() - 90 * 86400000).toISOString())}`, { method: "DELETE" }).catch(() => null);
    await freeBoardServiceRest(`frck_visit_push_requests?created_at=lt.${encodeURIComponent(new Date(Date.now() - 2 * 86400000).toISOString())}`, { method: "DELETE" }).catch(() => null);
    console.log(`[cron visit-push] kind=${kind} day=${day} visits=${visits.length} ${JSON.stringify(result)}`);
    return json({ ok: true, kind, day, visits: visits.length, ...result });
  } catch (error) {
    console.error("[cron visit-push] failed", error instanceof Error ? error.message : error);
    return json({ error: "알림을 보내지 못했습니다." }, 503);
  }
}

