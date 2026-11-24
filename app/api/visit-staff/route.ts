import { freeBoardServiceRest } from "../../../lib/free-board-moderation";
import { getSession, hashPassword, normalizeEmail, sameOrigin } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const validId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const cleanName = (value: unknown) => (typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 50 ? value.trim() : null);
const cleanPassword = (value: unknown) => (typeof value === "string" && value.length >= 8 && value.length <= 100 ? value : null);

// 관리자만 사용할 수 있습니다. 비밀번호 암호값(password_hash)은 어떤 응답에도 포함하지 않습니다.
async function requireAdmin(request: Request, mutating: boolean): Promise<{ response: Response } | { response?: undefined }> {
  if (mutating && !sameOrigin(request)) return { response: json({ error: "요청을 확인해 주세요." }, 403) };
  const user = await getSession(request);
  if (!user) return { response: json({ error: "로그인이 필요합니다." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "관리자만 사용할 수 있습니다." }, 403) };
  return {};
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request, false);
  if (auth.response) return auth.response;
  try {
    const response = await freeBoardServiceRest("frck_visit_staff?select=id,email,name,role,active,created_at&order=created_at.asc&limit=200", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return json({ staff: await response.json() });
  } catch (error) {
    console.error("[visit-staff] list failed", error instanceof Error ? error.message : error);
    return json({ staff: [], error: "계정 목록을 불러오지 못했습니다." }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request, true);
  if (auth.response) return auth.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const email = normalizeEmail(data?.email), name = cleanName(data?.name), password = cleanPassword(data?.password);
  const role = data?.role === "elder" || data?.role === "deacon" ? data.role : null;
  if (!email || !name || !role) return json({ error: "이메일, 이름, 역할을 확인해 주세요." }, 400);
  if (!password) return json({ error: "비밀번호는 8자 이상으로 입력해 주세요." }, 400);
  try {
    const response = await freeBoardServiceRest("frck_visit_staff?select=id,email,name,role,active,created_at", {
      method: "POST", headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ email, name, role, password_hash: hashPassword(password) }),
    });
    if (response.status === 409) return json({ error: "이미 등록된 이메일입니다." }, 409);
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json();
    return json({ ok: true, staff: row }, 201);
  } catch (error) {
    console.error("[visit-staff] create failed", error instanceof Error ? error.message : error);
    return json({ error: "계정을 만들지 못했습니다. 이미 등록된 이메일인지 확인해 주세요." }, 503);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request, true);
  if (auth.response) return auth.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "계정을 확인해 주세요." }, 400);
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.active !== undefined) { if (typeof data.active !== "boolean") return json({ error: "상태를 확인해 주세요." }, 400); fields.active = data.active; }
  if (data.role !== undefined) { if (data.role !== "elder" && data.role !== "deacon") return json({ error: "역할을 확인해 주세요." }, 400); fields.role = data.role; }
  if (data.name !== undefined) { const name = cleanName(data.name); if (!name) return json({ error: "이름을 확인해 주세요." }, 400); fields.name = name; }
  if (data.password !== undefined) { const password = cleanPassword(data.password); if (!password) return json({ error: "비밀번호는 8자 이상으로 입력해 주세요." }, 400); fields.password_hash = hashPassword(password); }
  if (Object.keys(fields).length === 1) return json({ error: "바꿀 내용이 없습니다." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_staff?id=eq.${data.id}&select=id,email,name,role,active,created_at`, {
      method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(fields),
    });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json();
    if (!row) return json({ error: "계정을 찾을 수 없습니다." }, 404);
    return json({ ok: true, staff: row });
  } catch (error) {
    console.error("[visit-staff] update failed", error instanceof Error ? error.message : error);
    return json({ error: "계정을 수정하지 못했습니다." }, 503);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request, true);
  if (auth.response) return auth.response;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  if (!validId(data?.id)) return json({ error: "계정을 확인해 주세요." }, 400);
  try {
    const response = await freeBoardServiceRest(`frck_visit_staff?id=eq.${data.id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!response.ok) throw new Error(await response.text());
    const deleted = await response.json() as unknown[];
    if (!deleted.length) return json({ error: "이미 삭제되었거나 계정을 찾을 수 없습니다." }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error("[visit-staff] delete failed", error instanceof Error ? error.message : error);
    return json({ error: "계정을 삭제하지 못했습니다." }, 503);
  }
}
