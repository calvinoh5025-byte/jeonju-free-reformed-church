import { adminPassword, cleanName, clearSessionCookie, clientIp, createSessionCookie, getSession, getStaffHash, loginLocked, logLogin, noteLoginFailure, safeEqual, sameOrigin, takeLoginAttempt, verifyPassword, type VisitUser } from "../../../lib/visit-auth";

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

export async function GET(request: Request) {
  const user = await getSession(request);
  return json({ user });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  let data: { name?: unknown; password?: unknown };
  try { data = await request.json(); } catch { return json({ error: "요청 내용을 확인해 주세요." }, 400); }
  const name = cleanName(data?.name);
  const password = typeof data?.password === "string" ? data.password : "";
  if (!name) return json({ error: "이름을 입력해 주세요." }, 400);
  if (!password || password.length > 200) return json({ error: "비밀번호를 입력해 주세요." }, 400);
  if (!takeLoginAttempt(`ip:${clientIp(request)}`)) return json({ error: "로그인 시도가 너무 많습니다. 10분 뒤에 다시 시도해 주세요." }, 429);

  if (loginLocked()) return json({ error: "로그인 시도가 비정상적으로 많아 잠시 막았습니다. 1시간 뒤에 다시 시도하거나 관리자에게 알려 주세요." }, 429);
  const fail = () => { noteLoginFailure(); return json({ error: "비밀번호가 맞지 않습니다." }, 401); };
  try {
    let user: VisitUser | null = null;
    let secretValue = "";
    const admin = adminPassword();
    if (admin && safeEqual(password, admin)) {
      user = { name, role: "admin" }; secretValue = admin;
    } else {
      const hash = await getStaffHash();
      if (verifyPassword(password, hash) && hash) { user = { name, role: "staff" }; secretValue = hash; }
    }
    if (!user) return fail();
    await logLogin(user);
    return json({ user }, 200, { "Set-Cookie": createSessionCookie(user, secretValue) });
  } catch (error) {
    console.error("[visit-auth] login failed", error instanceof Error ? error.message : error);
    return json({ error: "로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "요청을 확인해 주세요." }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
