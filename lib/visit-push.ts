import webpush from "web-push";
import { freeBoardServiceRest } from "./free-board-moderation";

// 심방 일정 푸시 알림.
// - 알림을 받기로 한 기기(브라우저)의 알림 주소만 저장합니다. 이름·이메일·전화번호는 저장하지 않습니다.
// - 알림에는 날짜·시간·심방 종류만 담습니다. 가정 이름, 대상자, 메모는 절대 넣지 않습니다.
export type PushKind = "elder" | "deacon" | "special";
export const ALL_KINDS: PushKind[] = ["elder", "deacon", "special"];
export const kindLabel: Record<PushKind, string> = { elder: "장로 심방", deacon: "집사 심방", special: "특별 심방" };

export type PushSub = { id: number; endpoint: string; p256dh: string; auth: string; kinds: string[] | null; target_ids?: number[] | null; failures: number };
export type PushPayload = { title: string; body: string; url: string; tag: string };
export type VisitLite = { id: number; starts_at: string; kind: PushKind; pastor: boolean; status: string; target_ids?: number[] | null };

const SITE_URL = "https://freerck.com";

// ---------- 알림 서버 키(VAPID) ----------
// 처음 한 번 자동으로 만들어 서버 전용 설정 테이블(frck_visit_settings)에 저장합니다. 따로 환경 변수를 넣을 필요가 없습니다.
let cachedKeys: { publicKey: string; privateKey: string } | null = null;

async function readSetting(key: string) {
  const response = await freeBoardServiceRest(`frck_visit_settings?select=value&key=eq.${key}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`settings status ${response.status}`);
  const rows = await response.json() as Array<{ value: string }>;
  return rows[0]?.value ?? null;
}

export async function getVapid() {
  if (cachedKeys) return cachedKeys;
  let publicKey = await readSetting("vapid_public");
  let privateKey = await readSetting("vapid_private");
  if (!publicKey || !privateKey) {
    const fresh = webpush.generateVAPIDKeys();
    // 동시에 두 곳에서 만들어도 먼저 저장된 것 하나만 남도록 '이미 있으면 무시'로 저장합니다.
    for (const [key, value] of [["vapid_public", fresh.publicKey], ["vapid_private", fresh.privateKey]] as const) {
      const response = await freeBoardServiceRest("frck_visit_settings?on_conflict=key", {
        method: "POST", headers: { "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ key, value }),
      });
      if (!response.ok) throw new Error(`vapid save failed ${response.status}`);
    }
    publicKey = await readSetting("vapid_public");
    privateKey = await readSetting("vapid_private");
  }
  if (!publicKey || !privateKey) throw new Error("vapid keys unavailable");
  cachedKeys = { publicKey, privateKey };
  return cachedKeys;
}

// ---------- 한국 시간 표시 ----------
const kstMD = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short" });
const kstHM = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit", hour12: true });
const kstYMD = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const kstHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", hourCycle: "h23" });
export const kstDateKey = (date: Date) => kstYMD.format(date);
export const kstHourNow = () => Number(kstHour.format(new Date()));
export const visitLabel = (v: { starts_at: string; kind: PushKind; pastor?: boolean }) => `${kstMD.format(new Date(v.starts_at))} ${kstHM.format(new Date(v.starts_at))} ${kindLabel[v.kind] ?? "심방"}${v.pastor ? "(목사 동행)" : ""}`;
export const dayStartIso = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`).toISOString();
export const dayEndIso = (ymd: string) => new Date(`${ymd}T23:59:59.999+09:00`).toISOString();
export const addDays = (ymd: string, days: number) => kstYMD.format(new Date(new Date(`${ymd}T12:00:00+09:00`).getTime() + days * 86400000));

// ---------- 보내기 ----------
// 시험용: VISIT_PUSH_FAKE_URL 이 설정되면 실제 푸시 서비스 대신 그 주소로 내용을 보냅니다. (운영에서는 설정하지 않습니다)
export async function sendPush(sub: PushSub, payload: PushPayload): Promise<{ ok: boolean; gone: boolean; status?: number }> {
  const fake = process.env.VISIT_PUSH_FAKE_URL;
  if (fake) {
    const response = await fetch(fake, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, payload }) });
    return { ok: response.ok, gone: response.status === 410 };
  }
  const vapid = await getVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 12 * 60 * 60, urgency: "normal", vapidDetails: { subject: SITE_URL, publicKey: vapid.publicKey, privateKey: vapid.privateKey } },
    );
    return { ok: true, gone: false };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return { ok: false, gone: status === 404 || status === 410, status };
  }
}

// 보낸 결과를 기록합니다: 성공이면 실패 횟수를 0으로, 사라진 주소(앱 삭제 등)는 삭제, 계속 실패하면 5번째에 삭제.
export async function recordResult(sub: PushSub, result: { ok: boolean; gone: boolean }) {
  try {
    if (result.ok) {
      await freeBoardServiceRest(`frck_visit_push_subscriptions?id=eq.${sub.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ failures: 0, last_sent_at: new Date().toISOString() }) });
    } else if (result.gone || sub.failures + 1 >= 5) {
      await freeBoardServiceRest(`frck_visit_push_subscriptions?id=eq.${sub.id}`, { method: "DELETE" });
    } else {
      await freeBoardServiceRest(`frck_visit_push_subscriptions?id=eq.${sub.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ failures: sub.failures + 1 }) });
    }
  } catch (error) { console.error("[visit-push] record failed", error instanceof Error ? error.message : error); }
}

export async function sendAll(items: Array<{ sub: PushSub; payload: PushPayload }>) {
  let sent = 0, failed = 0;
  for (let i = 0; i < items.length; i += 20) {
    const chunk = items.slice(i, i + 20);
    const results = await Promise.all(chunk.map(async ({ sub, payload }) => { const result = await sendPush(sub, payload); await recordResult(sub, result); return result; }));
    for (const r of results) { if (r.ok) sent++; else failed++; }
  }
  return { sent, failed };
}

// ---------- 남용 방지(요청 횟수 제한) ----------
export async function takeLimit(key: string, max: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const response = await freeBoardServiceRest(`frck_visit_push_requests?select=id&key=eq.${encodeURIComponent(key)}&created_at=gte.${encodeURIComponent(since)}&limit=${max}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`limit status ${response.status}`);
  if (((await response.json()) as unknown[]).length >= max) return false;
  await freeBoardServiceRest("frck_visit_push_requests", { method: "POST", headers: { "content-type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ key }) });
  return true;
}

// 알림 주소는 실제 푸시 서비스(크롬, 사파리, 파이어폭스, 엣지) 것만 받습니다. 아무 주소나 넣어서 서버가 엉뚱한 곳으로 요청을 보내게 하는 것을 막습니다.
export function validEndpoint(value: unknown) {
  if (typeof value !== "string" || value.length < 20 || value.length > 1000) return false;
  if (process.env.VISIT_PUSH_FAKE_URL && value.startsWith("https://push.test.invalid/")) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    return /(^|\.)(googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com|push\.microsoft\.com)$/.test(url.hostname);
  } catch { return false; }
}

const b64url = /^[A-Za-z0-9_-]+={0,2}$/;
export const validKey = (value: unknown, min: number, max: number) => typeof value === "string" && value.length >= min && value.length <= max && b64url.test(value);
export function cleanKinds(value: unknown): PushKind[] {
  if (!Array.isArray(value)) return [...ALL_KINDS];
  const out = ALL_KINDS.filter(k => value.includes(k));
  return out.length ? out : [...ALL_KINDS];
}

// ---------- 일정 알림 만들기 ----------
export async function claimDeliveries(rows: Array<{ subscription_id: number; visit_id: number; reminder: string; starts_at_sent: string }>) {
  if (!rows.length) return [] as typeof rows;
  const response = await freeBoardServiceRest("frck_visit_push_deliveries?on_conflict=subscription_id,visit_id,reminder,starts_at_sent&select=subscription_id,visit_id,reminder,starts_at_sent", {
    method: "POST", headers: { "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`claim failed ${response.status}`);
  return await response.json() as typeof rows;
}

export async function listSubscriptions(ids?: number[]) {
  const filter = ids ? `&id=in.(${ids.join(",")})` : "";
  const response = await freeBoardServiceRest(`frck_visit_push_subscriptions?select=id,endpoint,p256dh,auth,kinds,target_ids,failures${filter}&limit=5000`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`subs status ${response.status}`);
  return await response.json() as PushSub[];
}

const isPersonal = (sub: PushSub) => Array.isArray(sub.target_ids) && sub.target_ids.length > 0;
// '내 가정 알림'을 고른 기기는 그 가정의 심방만, 아니면 고른 심방 종류 전체를 받습니다.
const wants = (sub: PushSub, v: VisitLite) => isPersonal(sub)
  ? (v.target_ids ?? []).some(id => sub.target_ids!.includes(id))
  : (sub.kinds && sub.kinds.length ? sub.kinds : ALL_KINDS).includes(v.kind);
const labelFor = (sub: PushSub, v: { starts_at: string; kind: PushKind; pastor?: boolean }) =>
  isPersonal(sub) ? visitLabel(v).replace(kindLabel[v.kind], `내 ${kindLabel[v.kind]}`) : visitLabel(v);

// 하루치 심방 알림(전날 저녁 'eve' / 당일 아침 'morning')을 구독한 기기별로 한 번씩 보냅니다.
export async function sendDayReminders(reminder: "eve" | "morning", visits: VisitLite[], day: string) {
  const subs = await listSubscriptions();
  const planned: Array<{ sub: PushSub; list: VisitLite[] }> = [];
  for (const sub of subs) {
    const list = visits.filter(v => wants(sub, v));
    if (list.length) planned.push({ sub, list });
  }
  const claimed = await claimDeliveries(planned.flatMap(({ sub, list }) => list.map(v => ({ subscription_id: sub.id, visit_id: v.id, reminder, starts_at_sent: v.starts_at }))));
  const mine = new Map<number, Set<number>>();
  for (const c of claimed) { if (!mine.has(c.subscription_id)) mine.set(c.subscription_id, new Set()); mine.get(c.subscription_id)!.add(c.visit_id); }
  const items: Array<{ sub: PushSub; payload: PushPayload }> = [];
  for (const { sub, list } of planned) {
    const ids = mine.get(sub.id);
    const fresh = ids ? list.filter(v => ids.has(v.id)) : [];
    if (!fresh.length) continue;
    const shown = fresh.slice(0, 3).map(v => labelFor(sub, v)).join(" / ");
    items.push({ sub, payload: { title: reminder === "eve" ? "내일 심방 일정" : "오늘 심방 일정", body: shown + (fresh.length > 3 ? ` 외 ${fresh.length - 3}건` : ""), url: "/visits", tag: `visit-${reminder}-${day}` } });
  }
  const result = await sendAll(items);
  return { subscribers: subs.length, ...result };
}

// 일정이 취소되거나 시간이 바뀌었을 때, 이미 알림을 받은 기기에만 정정 알림을 보냅니다.
export async function notifyVisitChange(before: VisitLite, after: { starts_at: string; status: string } | null) {
  if (before.status !== "scheduled") return { sent: 0, failed: 0 };
  const cancelled = !after || after.status === "cancelled";
  const moved = !!after && after.status !== "cancelled" && new Date(after.starts_at).getTime() !== new Date(before.starts_at).getTime();
  if (!cancelled && !moved) return { sent: 0, failed: 0 };
  const response = await freeBoardServiceRest(`frck_visit_push_deliveries?select=subscription_id&visit_id=eq.${before.id}&reminder=in.(eve,morning)&starts_at_sent=eq.${encodeURIComponent(before.starts_at)}&limit=5000`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`deliveries status ${response.status}`);
  const ids = Array.from(new Set(((await response.json()) as Array<{ subscription_id: number }>).map(r => r.subscription_id)));
  if (!ids.length) return { sent: 0, failed: 0 };
  const reminder = cancelled ? "cancel" : "change";
  const claimed = await claimDeliveries(ids.map(subscription_id => ({ subscription_id, visit_id: before.id, reminder, starts_at_sent: before.starts_at })));
  if (!claimed.length) return { sent: 0, failed: 0 };
  const subs = await listSubscriptions(claimed.map(c => c.subscription_id));
  const bodyFor = (sub: PushSub) => cancelled ? `${labelFor(sub, before)} 일정이 취소되었습니다.` : `${labelFor(sub, before)} → ${labelFor(sub, { ...before, starts_at: after!.starts_at })}`;
  return await sendAll(subs.map(sub => ({ sub, payload: { title: cancelled ? "심방 일정 취소" : "심방 일정 변경", body: bodyFor(sub), url: "/visits", tag: `visit-change-${before.id}` } })));
}
