import { freeBoardServiceRest } from "../../../lib/free-board-moderation";
import { getSession, sameOrigin } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const COLUMNS = "round_id,target_id,manual_done,manual_done_at";
const validId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const MAX_ADD = 500;

async function auth(request: Request, mutating: boolean) {
  if (mutating && !sameOrigin(request)) return { response: json({ error: "요청을 확인해 주세요." }, 403) };
  const user = await getSession(request);
  if (!user) return { response: json({ error: "로그인이 필요합니다." }, 401) };
  return {};
}

async function rows<T>(path: string) {
  const response = await freeBoardServiceRest(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return await response.json() as T[];
}

type TargetRow = { id: number; family: string | null; tags: string[] | null; active: boolean };

// 심방 시기별 명단(성찬을 시작할 때 그 차수의 대상자). 로그인한 직분자 모두 보고 고칠 수 있습니다.
export async function GET(request: Request) {
  const a = await auth(request, false);
  if (a.response) return a.response;
  const raw = new URL(request.url).searchParams.get("round_ids") ?? "";
  const ids = raw.split(",").map(item => Number(item)).filter(validId).slice(0, 60);
  if (!ids.length) return json({ members: [] });
  try { return json({ members: await rows(`frck_visit_round_members?select=${COLUMNS}&round_id=in.(${ids.join(",")})&limit=20000`) }); }
  catch (error) {
    console.error("[visit-round-members] list failed", error instanceof Error ? error.message : error);
    return json({ members: [], error: "명단을 불러오지 못했습니다." }, 503);
  }
}

// 명단에 넣기: target_ids(직접 고른 사람) 또는 import(불러오기: 지난 시기 / 분류 / 전체).
export async function POST(request: Request) {
  const a = await auth(request, true);
  if (a.response) return a.response;
  let data: { round_id?: unknown; target_ids?: unknown; import?: { from?: unknown; source_round_id?: unknown; tag?: unknown; include_family?: unknown } };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.round_id)) return json({ error: "심방 시기를 확인해 주세요." }, 400);
  const roundId = data.round_id;
  try {
    if ((await rows(`frck_visit_rounds?select=id&id=eq.${roundId}&limit=1`)).length === 0) return json({ error: "심방 시기를 찾을 수 없습니다." }, 404);
    let ids: number[] = [];
    if (data.import) {
      const from = data.import.from;
      if (from === "round") {
        if (!validId(data.import.source_round_id)) return json({ error: "불러올 지난 시기를 골라 주세요." }, 400);
        const source = await rows<{ target_id: number }>(`frck_visit_round_members?select=target_id&round_id=eq.${data.import.source_round_id}&limit=5000`);
        const active = new Set((await rows<TargetRow>("frck_visit_targets?select=id,active&active=eq.true&limit=5000")).map(t => t.id));
        ids = source.map(m => m.target_id).filter(id => active.has(id));
      } else if (from === "tag") {
        const tag = typeof data.import.tag === "string" ? data.import.tag.trim() : "";
        if (!tag || tag.length > 20) return json({ error: "분류를 골라 주세요." }, 400);
        const all = (await rows<TargetRow>("frck_visit_targets?select=id,family,tags,active&active=eq.true&limit=5000"));
        const tagged = all.filter(t => (t.tags ?? []).includes(tag));
        const families = new Set(tagged.map(t => t.family).filter(Boolean));
        ids = (data.import.include_family === true ? all.filter(t => (t.tags ?? []).includes(tag) || (t.family && families.has(t.family))) : tagged).map(t => t.id);
      } else if (from === "all") {
        ids = (await rows<TargetRow>("frck_visit_targets?select=id,active&active=eq.true&limit=5000")).map(t => t.id);
      } else return json({ error: "불러오는 방법을 확인해 주세요." }, 400);
    } else {
      const raw = data.target_ids;
      if (!Array.isArray(raw) || raw.length > MAX_ADD || !raw.every(validId)) return json({ error: "추가할 대상자를 확인해 주세요." }, 400);
      ids = Array.from(new Set(raw as number[]));
      if (ids.length) {
        const found = await rows(`frck_visit_targets?select=id&id=in.(${ids.join(",")})`);
        if (found.length !== ids.length) return json({ error: "명단에 없는 대상자가 있습니다." }, 400);
      }
    }
    ids = Array.from(new Set(ids)).slice(0, 5000);
    if (!ids.length) return json({ ok: true, added: 0, skipped: 0 }, 201);
    const response = await freeBoardServiceRest("frck_visit_round_members?on_conflict=round_id,target_id&select=target_id", {
      method: "POST", headers: { "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(ids.map(target_id => ({ round_id: roundId, target_id }))),
    });
    if (!response.ok) throw new Error(await response.text());
    const added = (await response.json() as unknown[]).length;
    return json({ ok: true, added, skipped: ids.length - added }, 201);
  } catch (error) {
    console.error("[visit-round-members] add failed", error instanceof Error ? error.message : error);
    return json({ error: "명단에 넣지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

// 일정을 거치지 않고 직접 완료로 표시하거나 해제합니다.
export async function PATCH(request: Request) {
  const a = await auth(request, true);
  if (a.response) return a.response;
  let data: { round_id?: unknown; target_id?: unknown; manual_done?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.round_id) || !validId(data?.target_id) || typeof data.manual_done !== "boolean") return json({ error: "요청 내용을 확인해 주세요." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_round_members?round_id=eq.${data.round_id}&target_id=eq.${data.target_id}&select=${COLUMNS}`, {
      method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ manual_done: data.manual_done, manual_done_at: data.manual_done ? new Date().toISOString() : null }),
    });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as unknown[];
    if (!row) return json({ error: "이 시기 명단에 없는 분입니다." }, 404);
    return json({ ok: true, member: row });
  } catch (error) {
    console.error("[visit-round-members] update failed", error instanceof Error ? error.message : error);
    return json({ error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  const a = await auth(request, true);
  if (a.response) return a.response;
  let data: { round_id?: unknown; target_ids?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.round_id) || !Array.isArray(data.target_ids) || data.target_ids.length === 0 || data.target_ids.length > MAX_ADD || !data.target_ids.every(validId)) return json({ error: "요청 내용을 확인해 주세요." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_round_members?round_id=eq.${data.round_id}&target_id=in.(${(data.target_ids as number[]).join(",")})`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!response.ok) throw new Error(await response.text());
    return json({ ok: true, removed: (await response.json() as unknown[]).length });
  } catch (error) {
    console.error("[visit-round-members] remove failed", error instanceof Error ? error.message : error);
    return json({ error: "명단에서 빼지 못했습니다." }, 503);
  }
}
