import { getSession, getStaffHash, recentLogins, sameOrigin, setStaffPassword } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// 관리자 전용: 직분자 공용 비밀번호를 정하거나 바꿉니다. 바꾸면 이전에 로그인한 직분자는 모두 로그아웃됩니다.
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  if (user.role !== "admin") return json({ error: "관리자만 사용할 수 있습니다." }, 403);
  try {
    const configured = !!(await getStaffHash());
    const logins = await recentLogins(15).catch(() => []);
    return json({ configured, logins: logins.map(row => ({ name: row.name, role: row.role, at: row.created_at })) });
  } catch { return json({ error: "설정을 불러오지 못했습니다." }, 503); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  const user = await getSession(request);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  if (user.role !== "admin") return json({ error: "관리자만 사용할 수 있습니다." }, 403);
  let data: { password?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const password = typeof data?.password === "string" ? data.password : "";
  if (password.length < 10 || password.length > 100) return json({ error: "비밀번호는 10자 이상 100자 이하로 입력해 주세요." }, 400);
  if (/^(.)\1+$/.test(password) || /^\d+$/.test(password)) return json({ error: "같은 글자 반복이나 숫자만으로는 만들 수 없습니다. 글자를 섞어 주세요." }, 400);
  try { await setStaffPassword(password); return json({ ok: true }); }
  catch (error) {
    console.error("[visit-settings] save failed", error instanceof Error ? error.message : error);
    return json({ error: "비밀번호를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
