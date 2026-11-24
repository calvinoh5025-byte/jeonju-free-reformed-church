import { freeBoardServiceRest } from "../../../lib/free-board-moderation";
import { getSession, sameOrigin, type VisitUser } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const COLUMNS = "id,starts_at,kind,pastor,status,target_ids,memo,created_by";
const EDIT_LIMIT = 10;
const VISIT_MINUTES = 60; // 일정 하나를 약 1시간으로 보고, 앞뒤 1시간 안에 다른 일정이 있으면 겹치는 것으로 봅니다.

type Row = { id: number; starts_at: string; kind: "elder" | "deacon" | "special"; pastor: boolean; status: "scheduled" | "done" | "cancelled"; target_ids: number[] | null; memo: string | null; created_by: string | null };
type Edit = { visit_id: number; editor_name: string; action: string; created_at: string };

// 로그인한 직분자는 모두 같은 권한입니다(모든 일정을 보고 고칠 수 있음). 누가 고쳤는지는 수정 기록에 남습니다.
function present(row: Row, edits: Edit[]) {
  return {
    id: row.id, starts_at: row.starts_at, kind: row.kind, pastor: row.pastor, status: row.status,
    target_ids: row.target_ids ?? [], memo: row.memo,
    edits: edits.filter(edit => edit.visit_id === row.id).slice(0, EDIT_LIMIT).map(edit => ({ name: edit.editor_name, action: edit.action, at: edit.created_at })),
  };
}

function cleanTargetIds(value: unknown) {
  if (value === null || value === undefined) return [] as number[];
  if (!Array.isArray(value) || value.length > 20) return undefined;
  const out: number[] = [];
  for (const item of value) {
    if (!Number.isSafeInteger(item) || (item as number) <= 0) return undefined;
    if (!out.includes(item as number)) out.push(item as number);
  }
  return out;
}

// 명단에 실제로 있는 대상자만 일정에 넣을 수 있습니다.
async function allExist(ids: number[]) {
  if (!ids.length) return true;
  const response = await freeBoardServiceRest(`frck_visit_targets?select=id&id=in.(${ids.join(",")})`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`targets status ${response.status}`);
  return ((await response.json()) as unknown[]).length === ids.length;
}

function cleanMemo(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= 2000 ? (text || null) : undefined;
}

function parseFields(data: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {};
  if (!partial || data.starts_at !== undefined) {
    const time = typeof data.starts_at === "string" ? new Date(data.starts_at) : null;
    if (!time || Number.isNaN(time.getTime()) || time.getFullYear() < 2020 || time.getFullYear() > 2100) return { error: "날짜와 시간을 확인해 주세요." };
    out.starts_at = time.toISOString();
  }
  if (!partial || data.kind !== undefined) {
    if (data.kind !== "elder" && data.kind !== "deacon" && data.kind !== "special") return { error: "심방 종류를 확인해 주세요." };
    out.kind = data.kind;
  }
  if (!partial || data.pastor !== undefined) out.pastor = data.pastor === true;
  if (data.status !== undefined) {
    if (data.status !== "scheduled" && data.status !== "done" && data.status !== "cancelled") return { error: "상태를 확인해 주세요." };
    out.status = data.status;
  }
  if (!partial || data.target_ids !== undefined) {
    const ids = cleanTargetIds(data.target_ids);
    if (ids === undefined) return { error: "심방 대상자는 명단에서 20명까지 고를 수 있습니다." };
    out.target_ids = ids;
  }
  if (!partial || data.memo !== undefined) {
    const memo = cleanMemo(data.memo);
    if (memo === undefined) return { error: "메모는 2000자까지 입력할 수 있습니다." };
    out.memo = memo;
  }
  return { fields: out };
}

async function load(id: number) {
  const response = await freeBoardServiceRest(`frck_visits?select=${COLUMNS}&id=eq.${id}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return ((await response.json()) as Row[])[0] ?? null;
}

async function loadEdits(ids: number[]) {
  if (!ids.length) return [] as Edit[];
  const response = await freeBoardServiceRest(`frck_visit_edits?select=visit_id,editor_name,action,created_at&visit_id=in.(${ids.join(",")})&order=created_at.desc&limit=5000`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`edits status ${response.status}`);
  return await response.json() as Edit[];
}

// 수정 기록은 보조 정보이므로, 기록에 실패해도 일정 저장 자체는 성공으로 처리합니다.
async function logEdit(visitId: number, user: VisitUser, action: string) {
  try {
    const response = await freeBoardServiceRest("frck_visit_edits", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ visit_id: visitId, editor_name: user.name.slice(0, 50), action }),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    console.error("[visits] edit log failed", error instanceof Error ? error.message : error);
  }
}

function describeChange(fields: Record<string, unknown>, before: Row) {
  const keys = Object.keys(fields);
  if (keys.length === 1 && keys[0] === "status") {
    if (fields.status === "done") return "완료";
    if (fields.status === "cancelled") return "취소";
    return before.status === "done" ? "완료 취소" : "취소 해제";
  }
  return "수정";
}

// 겹침 규칙 (취소된 일정과 수정 중인 자기 자신은 제외, 일정 하나를 약 1시간으로 봄)
// 1) 같은 종류끼리(장로+장로, 집사+집사, 특별+특별)는 앞뒤 1시간이 겹치면 안 됩니다.
// 2) 다른 종류끼리(장로+집사 등)는 시간이 겹쳐도 되지만, 같은 대상자가 두 곳에 들어가면 안 됩니다.
// 3) 목사 동행이 있는 일정끼리는 종류와 상관없이 겹치면 안 됩니다. (목사님은 한 번에 한 곳만 갈 수 있음)
const SAME_KIND_MESSAGE = "그 시간에는 같은 종류의 심방 일정이 이미 있습니다(앞뒤 1시간). 장로 심방끼리, 집사 심방끼리는 겹칠 수 없습니다. 다른 시간을 골라 주세요.";
async function sameKindClash(startsAt: string, kind: string, excludeId?: number) {
  const start = new Date(startsAt).getTime();
  const lo = new Date(start - VISIT_MINUTES * 60 * 1000).toISOString();
  const hi = new Date(start + VISIT_MINUTES * 60 * 1000).toISOString();
  const exclude = excludeId ? `&id=neq.${excludeId}` : "";
  const response = await freeBoardServiceRest(`frck_visits?select=id&status=neq.cancelled&kind=eq.${kind}&starts_at=gt.${encodeURIComponent(lo)}&starts_at=lt.${encodeURIComponent(hi)}${exclude}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`overlap status ${response.status}`);
  return ((await response.json()) as unknown[]).length > 0;
}
const PASTOR_MESSAGE = "그 시간(앞뒤 1시간)에는 목사 동행이 이미 잡혀 있습니다. 목사님은 한 번에 한 곳만 동행할 수 있으니 다른 시간을 고르거나 목사 동행을 빼 주세요.";
const DB_CLASH_MESSAGE = "그 시간에 겹치는 심방 일정이 이미 있습니다. 다른 시간을 골라 주세요.";
async function pastorClash(startsAt: string, excludeId?: number) {
  const start = new Date(startsAt).getTime();
  const lo = new Date(start - VISIT_MINUTES * 60 * 1000).toISOString();
  const hi = new Date(start + VISIT_MINUTES * 60 * 1000).toISOString();
  const exclude = excludeId ? `&id=neq.${excludeId}` : "";
  const response = await freeBoardServiceRest(`frck_visits?select=id&status=neq.cancelled&pastor=eq.true&starts_at=gt.${encodeURIComponent(lo)}&starts_at=lt.${encodeURIComponent(hi)}${exclude}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`overlap status ${response.status}`);
  return ((await response.json()) as unknown[]).length > 0;
}
async function clashError(startsAt: string, kind: string, targetIds: number[], pastor: boolean, excludeId?: number) {
  if (await sameKindClash(startsAt, kind, excludeId)) return SAME_KIND_MESSAGE;
  if (pastor && (await pastorClash(startsAt, excludeId))) return PASTOR_MESSAGE;
  const clash = await clashingTargets(startsAt, targetIds, excludeId);
  return clash.length ? await clashMessage(clash) : null;
}
async function clashingTargets(startsAt: string, targetIds: number[], excludeId?: number) {
  if (!targetIds.length) return [] as number[];
  const start = new Date(startsAt).getTime();
  const lo = new Date(start - VISIT_MINUTES * 60 * 1000).toISOString();
  const hi = new Date(start + VISIT_MINUTES * 60 * 1000).toISOString();
  const exclude = excludeId ? `&id=neq.${excludeId}` : "";
  const response = await freeBoardServiceRest(`frck_visits?select=id,target_ids&status=neq.cancelled&target_ids=ov.{${targetIds.join(",")}}&starts_at=gt.${encodeURIComponent(lo)}&starts_at=lt.${encodeURIComponent(hi)}${exclude}&limit=50`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`overlap status ${response.status}`);
  const found = (await response.json()) as Array<{ target_ids: number[] | null }>;
  const taken = new Set(found.flatMap(row => row.target_ids ?? []));
  return targetIds.filter(id => taken.has(id));
}
async function clashMessage(ids: number[]) {
  let names = ids.map(id => `#${id}`);
  try {
    const rowsFound = (await (await freeBoardServiceRest(`frck_visit_targets?select=id,name&id=in.(${ids.join(",")})`, { headers: { Accept: "application/json" } })).json()) as Array<{ id: number; name: string }>;
    names = ids.map(id => rowsFound.find(row => row.id === id)?.name ?? `#${id}`);
  } catch { /* 이름을 못 찾아도 안내는 보냅니다 */ }
  return `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` 외 ${names.length - 3}명` : ""}은(는) 그 시간(앞뒤 1시간)에 이미 다른 심방 일정이 있습니다. 다른 시간을 고르거나 대상자를 바꿔 주세요.`;
}
const validId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  try {
    const url = new URL(request.url);
    const parse = (value: string | null) => { const time = value ? new Date(value) : null; return time && !Number.isNaN(time.getTime()) ? time : null; };
    const fromParam = parse(url.searchParams.get("from")), toParam = parse(url.searchParams.get("to"));
    const from = (fromParam ?? new Date(Date.now() - 93 * 24 * 60 * 60 * 1000)).toISOString();
    const upper = toParam && toParam.getTime() - new Date(from).getTime() <= 400 * 24 * 60 * 60 * 1000 ? `&starts_at=lte.${encodeURIComponent(toParam.toISOString())}` : "";
    const response = await freeBoardServiceRest(`frck_visits?select=${COLUMNS}&starts_at=gte.${encodeURIComponent(from)}${upper}&order=starts_at.asc&limit=2000`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const rows = await response.json() as Row[];
    let edits: Edit[] = [];
    try { edits = await loadEdits(rows.map(row => row.id)); } catch (error) { console.error("[visits] edits load failed", error instanceof Error ? error.message : error); }
    return json({ visits: rows.map(row => present(row, edits)) });
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
  const parsed = parseFields(data ?? {}, false);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    if (!(await allExist((parsed.fields.target_ids as number[]) ?? []))) return json({ error: "명단에 없는 대상자가 있습니다. 명단에서 다시 골라 주세요." }, 400);
    const clashText = await clashError(parsed.fields.starts_at as string, parsed.fields.kind as string, (parsed.fields.target_ids as number[]) ?? [], parsed.fields.pastor === true);
    if (clashText) return json({ error: clashText }, 409);
    const response = await freeBoardServiceRest(`frck_visits?select=${COLUMNS}`, {
      method: "POST", headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...parsed.fields, status: "scheduled", created_by: user.name }),
    });
    if (response.status === 409) return json({ error: DB_CLASH_MESSAGE }, 409);
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as Row[];
    await logEdit(row.id, user, "등록");
    return json({ ok: true, visit: present(row, await loadEdits([row.id]).catch(() => [])) }, 201);
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
  const parsed = parseFields(data, true);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const current = await load(data.id);
    if (!current) return json({ error: "일정을 찾을 수 없습니다." }, 404);
    if (parsed.fields.target_ids && !(await allExist(parsed.fields.target_ids as number[]))) return json({ error: "명단에 없는 대상자가 있습니다. 명단에서 다시 골라 주세요." }, 400);
    const nextStart = (parsed.fields.starts_at as string | undefined) ?? current.starts_at;
    const nextStatus = (parsed.fields.status as string | undefined) ?? current.status;
    const nextTargets = (parsed.fields.target_ids as number[] | undefined) ?? current.target_ids ?? [];
    const nextKind = (parsed.fields.kind as string | undefined) ?? current.kind;
    const nextPastor = (parsed.fields.pastor as boolean | undefined) ?? current.pastor;
    if ((parsed.fields.starts_at !== undefined || parsed.fields.status !== undefined || parsed.fields.target_ids !== undefined || parsed.fields.kind !== undefined || parsed.fields.pastor !== undefined) && nextStatus !== "cancelled") {
      const clashText = await clashError(nextStart, nextKind, nextTargets, nextPastor === true, data.id);
      if (clashText) return json({ error: clashText }, 409);
    }
    const response = await freeBoardServiceRest(`frck_visits?id=eq.${data.id}&select=${COLUMNS}`, {
      method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...parsed.fields, updated_at: new Date().toISOString() }),
    });
    if (response.status === 409) return json({ error: DB_CLASH_MESSAGE }, 409);
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as Row[];
    await logEdit(row.id, user, describeChange(parsed.fields, current));
    return json({ ok: true, visit: present(row, await loadEdits([row.id]).catch(() => [])) });
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
    const response = await freeBoardServiceRest(`frck_visits?id=eq.${data.id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!response.ok) throw new Error(await response.text());
    const deleted = await response.json() as unknown[];
    if (!deleted.length) return json({ error: "이미 삭제되었거나 일정을 찾을 수 없습니다." }, 404);
    console.log(`[visits] deleted id=${data.id} by ${user.name}`);
    return json({ ok: true });
  } catch (error) {
    console.error("[visits] delete failed", error instanceof Error ? error.message : error);
    return json({ error: "일정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

