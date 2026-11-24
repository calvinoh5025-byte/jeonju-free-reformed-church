import { adminConfig, clearSessionCookie, clientIp, createSessionCookie, findStaff, getSession, normalizeEmail, safeEqual, sameOrigin, takeLoginAttempt, verifyPassword, type VisitUser } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

export async function GET(request: Request) {
  const user = await getSession(request);
  return json({ user });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  let data: { email?: unknown; password?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const email = normalizeEmail(data?.email);
  const password = typeof data?.password === "string" ? data.password : "";
  if (!email || !password || password.length > 200) return json({ error: "이메일과 비밀번호를 확인해 주세요." }, 400);

  if (!takeLoginAttempt(`ip:${clientIp(request)}`, 20) || !takeLoginAttempt(`mail:${email}`, 8)) {
    return json({ error: "로그인 시도가 너무 많습니다. 10분 뒤에 다시 시도해 주세요." }, 429);
  }

  const fail = () => json({ error: "이메일 또는 비밀번호가 맞지 않습니다." }, 401);
  try {
    let user: VisitUser | null = null;
    const admin = adminConfig();
    if (admin && email === admin.email) {
      if (safeEqual(password, admin.password)) user = { email, name: "관리자", role: "admin" };
    } else {
      const staff = await findStaff(email);
      const ok = verifyPassword(password, staff?.password_hash);
      if (staff && staff.active && ok) user = { email: staff.email, name: staff.name, role: staff.role };
    }
    if (!user) return fail();
    return json({ user }, 200, { "Set-Cookie": createSessionCookie(user) });
  } catch (error) {
    console.error("[visit-auth] login failed", error instanceof Error ? error.message : error);
    return json({ error: "로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
