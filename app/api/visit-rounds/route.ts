import { freeBoardServiceRest } from "../../../lib/free-board-moderation";
import { getSession, sameOrigin } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const COLUMNS = "id,title,starts_on,ends_on,event_date";
const validId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00+09:00`).getTime()) && value >= "2020-01-01" && value <= "2100-12-31";
const cleanTitle = (value: unknown) => (typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim() : "");

async function auth(request: Request, mutating: boolean) {
  if (mutating && !sameOrigin(request)) return { response: json({ error: "요청을 확인해 주세요." }, 403) };
  const user = await getSession(request);
  if (!user) return { response: json({ error: "로그인이 필요합니다." }, 401) };
  return { user };
}

// 심방 시기(예: 2026년 하반기 심방). 이 기간 동안 대상자별로 심방을 했는지 확인합니다.
export async function GET(request: Request) {
  const a = await auth(request, false);
  if ("response" in a) return a.response;
  try {
    const response = await freeBoardServiceRest(`frck_visit_rounds?select=${COLUMNS}&order=starts_on.desc&limit=100`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return json({ rounds: await response.json() });
  } catch (error) {
    console.error("[visit-rounds] list failed", error instanceof Error ? error.message : error);
    return json({ rounds: [], error: "심방 시기를 불러오지 못했습니다." }, 503);
  }
}

export async function POST(request: Request) {
  const a = await auth(request, true);
  if ("response" in a) return a.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const title = cleanTitle(data?.title);
  if (!title || title.length > 60) return json({ error: "이름은 60자까지 입력할 수 있습니다." }, 400);
  if (!validDate(data?.starts_on) || !validDate(data?.ends_on)) return json({ error: "시작일과 종료일을 확인해 주세요." }, 400);
  if (data.ends_on < data.starts_on) return json({ error: "종료일은 시작일 이후여야 합니다." }, 400);
  if (data.event_date !== undefined && data.event_date !== null && data.event_date !== "" && !validDate(data.event_date)) return json({ error: "성찬 날을 확인해 주세요." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_rounds?select=${COLUMNS}`, { method: "POST", headers: { "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ title, starts_on: data.starts_on, ends_on: data.ends_on, event_date: data.event_date ? data.event_date : null }) });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as unknown[];
    return json({ ok: true, round: row }, 201);
  } catch (error) {
    console.error("[visit-rounds] create failed", error instanceof Error ? error.message : error);
    return json({ error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function PATCH(request: Request) {
  const a = await auth(request, true);
  if ("response" in a) return a.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "심방 시기를 확인해 주세요." }, 400);
  const fields: Record<string, unknown> = {};
  if (data.title !== undefined) { const title = cleanTitle(data.title); if (!title || title.length > 60) return json({ error: "이름을 확인해 주세요." }, 400); fields.title = title; }
  if (data.starts_on !== undefined) { if (!validDate(data.starts_on)) return json({ error: "시작일을 확인해 주세요." }, 400); fields.starts_on = data.starts_on; }
  if (data.ends_on !== undefined) { if (!validDate(data.ends_on)) return json({ error: "종료일을 확인해 주세요." }, 400); fields.ends_on = data.ends_on; }
  if (data.event_date !== undefined) { if (data.event_date === null || data.event_date === "") fields.event_date = null; else if (validDate(data.event_date)) fields.event_date = data.event_date; else return json({ error: "성찬 날을 확인해 주세요." }, 400); }
  if (typeof fields.starts_on === "string" && typeof fields.ends_on === "string" && fields.ends_on < fields.starts_on) return json({ error: "종료일은 시작일 이후여야 합니다." }, 400);
  if (!Object.keys(fields).length) return json({ error: "바꿀 내용이 없습니다." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_rounds?id=eq.${data.id}&select=${COLUMNS}`, { method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(fields) });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as unknown[];
    if (!row) return json({ error: "심방 시기를 찾을 수 없습니다." }, 404);
    return json({ ok: true, round: row });
  } catch (error) {
    console.error("[visit-rounds] update failed", error instanceof Error ? error.message : error);
    return json({ error: "수정하지 못했습니다. 시작일과 종료일을 확인해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  const a = await auth(request, true);
  if ("response" in a) return a.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "심방 시기를 확인해 주세요." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_rounds?id=eq.${data.id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!response.ok) throw new Error(await response.text());
    const deleted = await response.json() as unknown[];
    if (!deleted.length) return json({ error: "이미 삭제되었거나 찾을 수 없습니다." }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error("[visit-rounds] delete failed", error instanceof Error ? error.message : error);
    return json({ error: "삭제하지 못했습니다." }, 503);
  }
}




