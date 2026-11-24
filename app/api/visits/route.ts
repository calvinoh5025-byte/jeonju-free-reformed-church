import { freeBoardServiceRest } from "../../../lib/free-board-moderation";
import { canEditVisit, canSeeDetails, getSession, sameOrigin, type VisitUser } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const COLUMNS = "id,starts_at,kind,pastor,status,household,elder_name,memo,created_by";

type Row = { id: number; starts_at: string; kind: "elder" | "deacon"; pastor: boolean; status: "scheduled" | "done" | "cancelled"; household: string | null; elder_name: string | null; memo: string | null; created_by: string | null };

// 집사는 자기가 넣은 일정의 가정 정보만 볼 수 있습니다. 다른 일정은 날짜·시간·종류·목사 동행·상태만 보입니다.
function present(row: Row, user: VisitUser) {
  const mine = canSeeDetails(user, row.created_by);
  return {
    id: row.id, starts_at: row.starts_at, kind: row.kind, pastor: row.pastor, status: row.status,
    mine, household: mine ? row.household : null, elder_name: mine ? row.elder_name : null, memo: mine ? row.memo : null,
  };
}

function cleanText(value: unknown, max: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= max ? (text || null) : undefined;
}

function parseFields(data: Record<string, unknown>, user: VisitUser, partial: boolean) {
  const out: Record<string, unknown> = {};
  if (!partial || data.starts_at !== undefined) {
    const time = typeof data.starts_at === "string" ? new Date(data.starts_at) : null;
    if (!time || Number.isNaN(time.getTime()) || time.getFullYear() < 2020 || time.getFullYear() > 2100) return { error: "날짜와 시간을 확인해 주세요." };
    out.starts_at = time.toISOString();
  }
  if (user.role === "deacon") out.kind = "deacon";
  else if (!partial || data.kind !== undefined) {
    if (data.kind !== "elder" && data.kind !== "deacon") return { error: "심방 종류를 확인해 주세요." };
    out.kind = data.kind;
  }
  if (!partial || data.pastor !== undefined) out.pastor = data.pastor === true;
  if (data.status !== undefined) {
    if (data.status !== "scheduled" && data.status !== "done" && data.status !== "cancelled") return { error: "상태를 확인해 주세요." };
    out.status = data.status;
  }
  for (const [key, max] of [["household", 100], ["elder_name", 100], ["memo", 2000]] as const) {
    if (!partial || data[key] !== undefined) {
      const text = cleanText(data[key], max);
      if (text === undefined) return { error: "입력한 글자 수를 확인해 주세요." };
      out[key] = text;
    }
  }
  return { fields: out };
}

async function load(id: number) {
  const response = await freeBoardServiceRest(`frck_visits?select=${COLUMNS}&id=eq.${id}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return ((await response.json()) as Row[])[0] ?? null;
}

const validId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  try {
    const from = new Date(Date.now() - 93 * 24 * 60 * 60 * 1000).toISOString();
    const response = await freeBoardServiceRest(`frck_visits?select=${COLUMNS}&starts_at=gte.${encodeURIComponent(from)}&order=starts_at.asc&limit=1000`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const rows = await response.json() as Row[];
    return json({ visits: rows.map(row => present(row, user)) });
  } catch (error) {
    console.error("[visits] list failed", error instanceof Error ? error.message : error);
    return json({ visits: [], error: "일정을 불러오지 못했습니다." }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const parsed = parseFields(data ?? {}, user, false);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visits?select=${COLUMNS}`, {
      method: "POST", headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...parsed.fields, status: "scheduled", created_by: user.email }),
    });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as Row[];
    return json({ ok: true, visit: present(row, user) }, 201);
  } catch (error) {
    console.error("[visits] create failed", error instanceof Error ? error.message : error);
    return json({ error: "일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "일정을 확인해 주세요." }, 400);
  const parsed = parseFields(data, user, true);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const current = await load(data.id);
    if (!current) return json({ error: "일정을 찾을 수 없습니다." }, 404);
    if (!canEditVisit(user, current.created_by)) return json({ error: "이 일정을 수정할 권한이 없습니다." }, 403);
    const response = await freeBoardServiceRest(`frck_visits?id=eq.${data.id}&select=${COLUMNS}`, {
      method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...parsed.fields, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as Row[];
    return json({ ok: true, visit: present(row, user) });
  } catch (error) {
    console.error("[visits] update failed", error instanceof Error ? error.message : error);
    return json({ error: "일정을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "일정을 확인해 주세요." }, 400);
  try {
    const current = await load(data.id);
    if (!current) return json({ error: "이미 삭제되었거나 일정을 찾을 수 없습니다." }, 404);
    if (!canEditVisit(user, current.created_by)) return json({ error: "이 일정을 삭제할 권한이 없습니다." }, 403);
    const response = await freeBoardServiceRest(`frck_visits?id=eq.${data.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(await response.text());
    return json({ ok: true });
  } catch (error) {
    console.error("[visits] delete failed", error instanceof Error ? error.message : error);
    return json({ error: "일정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
