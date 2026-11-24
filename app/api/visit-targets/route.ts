import { freeBoardServiceRest } from "../../../lib/free-board-moderation";
import { getSession, sameOrigin } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const COLUMNS = "id,name,note,tags,family,active";
const cleanFamily = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const family = value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return family.length <= 50 ? (family || null) : undefined;
};
const validId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const cleanName = (value: unknown) => (typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim() : "");
const cleanNote = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= 500 ? (text || null) : undefined;
};

// 분류(태그): 최대 10개, 한 개당 20자. 중복·빈 값은 제거합니다.
function cleanTags(value: unknown) {
  if (value === null || value === undefined) return [] as string[];
  if (!Array.isArray(value) || value.length > 10) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return undefined;
    const tag = item.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
    if (!tag) continue;
    if (tag.length > 20) return undefined;
    if (!out.includes(tag)) out.push(tag);
  }
  return out;
}

async function auth(request: Request, mutating: boolean) {
  if (mutating && !sameOrigin(request)) return { response: json({ error: "요청을 확인해 주세요." }, 403) };
  const user = await getSession(request);
  if (!user) return { response: json({ error: "로그인이 필요합니다." }, 401) };
  return { user };
}

// 심방 대상자 명단: 로그인한 직분자 모두 보고 고칠 수 있습니다. 삭제 대신 '사용 안 함'으로 보관하면 지난 기록이 유지됩니다.
export async function GET(request: Request) {
  const a = await auth(request, false);
  if ("response" in a) return a.response;
  try {
    const response = await freeBoardServiceRest(`frck_visit_targets?select=${COLUMNS}&order=name.asc&limit=2000`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return json({ targets: await response.json() });
  } catch (error) {
    console.error("[visit-targets] list failed", error instanceof Error ? error.message : error);
    return json({ targets: [], error: "명단을 불러오지 못했습니다." }, 503);
  }
}

// 이름 여러 개를 한 번에 추가할 수 있습니다(names). 이미 있는 이름은 건너뜁니다.
export async function POST(request: Request) {
  const a = await auth(request, true);
  if ("response" in a) return a.response;
  let data: { name?: unknown; names?: unknown; note?: unknown; tags?: unknown; family?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const raw = Array.isArray(data?.names) ? data.names : [data?.name];
  if (raw.length > 300) return json({ error: "한 번에 300명까지 추가할 수 있습니다." }, 400);
  const names: string[] = [];
  for (const item of raw) {
    const name = cleanName(item);
    if (!name) continue;
    if (name.length > 50) return json({ error: "이름은 50자까지 입력할 수 있습니다." }, 400);
    if (!names.includes(name)) names.push(name);
  }
  if (!names.length) return json({ error: "추가할 이름을 입력해 주세요." }, 400);
  const note = cleanNote(data?.note);
  if (note === undefined) return json({ error: "메모는 500자까지 입력할 수 있습니다." }, 400);
  const family = cleanFamily(data?.family);
  if (family === undefined) return json({ error: "가족 이름은 50자까지 입력할 수 있습니다." }, 400);
  const tags = cleanTags(data?.tags);
  if (tags === undefined) return json({ error: "분류는 10개까지, 한 개당 20자까지 입력할 수 있습니다." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_targets?on_conflict=name&select=${COLUMNS}`, {
      method: "POST", headers: { "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(names.map(name => ({ name, note: names.length === 1 ? note : null, tags, family }))),
    });
    if (!response.ok) throw new Error(await response.text());
    const added = await response.json() as unknown[];
    return json({ ok: true, added, skipped: names.length - added.length }, 201);
  } catch (error) {
    console.error("[visit-targets] create failed", error instanceof Error ? error.message : error);
    return json({ error: "명단에 추가하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function PATCH(request: Request) {
  const a = await auth(request, true);
  if ("response" in a) return a.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "대상자를 확인해 주세요." }, 400);
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) { const name = cleanName(data.name); if (!name || name.length > 50) return json({ error: "이름을 확인해 주세요." }, 400); fields.name = name; }
  if (data.note !== undefined) { const note = cleanNote(data.note); if (note === undefined) return json({ error: "메모는 500자까지 입력할 수 있습니다." }, 400); fields.note = note; }
  if (data.family !== undefined) { const family = cleanFamily(data.family); if (family === undefined) return json({ error: "가족 이름은 50자까지 입력할 수 있습니다." }, 400); fields.family = family; }
  if (data.tags !== undefined) { const tags = cleanTags(data.tags); if (tags === undefined) return json({ error: "분류는 10개까지, 한 개당 20자까지 입력할 수 있습니다." }, 400); fields.tags = tags; }
  if (data.active !== undefined) { if (typeof data.active !== "boolean") return json({ error: "상태를 확인해 주세요." }, 400); fields.active = data.active; }
  if (Object.keys(fields).length === 1) return json({ error: "바꿀 내용이 없습니다." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_targets?id=eq.${data.id}&select=${COLUMNS}`, { method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(fields) });
    if (response.status === 409) return json({ error: "이미 명단에 있는 이름입니다." }, 409);
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as unknown[];
    if (!row) return json({ error: "대상자를 찾을 수 없습니다." }, 404);
    return json({ ok: true, target: row });
  } catch (error) {
    console.error("[visit-targets] update failed", error instanceof Error ? error.message : error);
    return json({ error: "수정하지 못했습니다. 같은 이름이 이미 있는지 확인해 주세요." }, 503);
  }
}


