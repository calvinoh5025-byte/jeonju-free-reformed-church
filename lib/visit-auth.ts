import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { freeBoardServiceRest } from "./free-board-moderation";

// 심방 일정 로그인.
// - 직분자(staff): 이름을 적고 "직분자 공용 비밀번호"를 입력합니다. 개인 계정·이메일은 없습니다.
//   공용 비밀번호는 관리자가 관리 화면에서 바꿉니다(바꾸면 기존 로그인은 모두 풀립니다).
// - 관리자(admin): 환경변수 VISIT_ADMIN_PASSWORD 로 로그인하고, 공용 비밀번호를 바꿀 수 있습니다.
export type VisitRole = "admin" | "staff";
export type VisitUser = { name: string; role: VisitRole };

export const SESSION_COOKIE = "frck_visit_session";
const SESSION_SECONDS = 90 * 24 * 60 * 60;

function secret() {
  const value = process.env.VISIT_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.length < 16) throw new Error("session secret is not configured");
  return value;
}

const mac = (text: string) => createHmac("sha256", secret()).update(text).digest("base64url");
const sign = (payload: string) => mac(`frck-visit-session:${payload}`);
const fingerprint = (text: string) => mac(`frck-visit-fingerprint:${text}`).slice(0, 16);

function safeEqual(a: string, b: string) {
  const left = createHmac("sha256", "cmp").update(a).digest();
  const right = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `s1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  // 저장된 값이 없을 때도 같은 시간이 걸리도록 항상 계산합니다.
  const parts = (stored ?? "").split("$");
  const valid = parts.length === 3 && parts[0] === "s1" && /^[a-f0-9]+$/.test(parts[1]) && /^[a-f0-9]+$/.test(parts[2]);
  const salt = Buffer.from(valid ? parts[1] : "00".repeat(16), "hex");
  const expected = Buffer.from(valid ? parts[2] : "00".repeat(64), "hex");
  const actual = scryptSync(password, salt, expected.length || 64);
  return valid && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function adminPassword() {
  const password = process.env.VISIT_ADMIN_PASSWORD;
  return password && password.length >= 10 ? password : null;
}

export function cleanName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= 50 ? name : null;
}

const SETTING_KEY = "staff_password_hash";

export async function getStaffHash(): Promise<string | null> {
  const response = await freeBoardServiceRest(`frck_visit_settings?select=value&key=eq.${SETTING_KEY}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`settings lookup failed: ${response.status}`);
  const rows = await response.json() as Array<{ value: string }>;
  return rows[0]?.value ?? null;
}

export async function setStaffPassword(password: string) {
  const response = await freeBoardServiceRest("frck_visit_settings?on_conflict=key", {
    method: "POST",
    headers: { "content-type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: SETTING_KEY, value: hashPassword(password), updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`settings save failed: ${response.status}`);
}

// 로그인 쿠키에는 "그때의 비밀번호 지문"이 들어갑니다. 공용 비밀번호를 바꾸면 지문이 달라져 이전 로그인이 모두 무효가 됩니다.
export function createSessionCookie(user: VisitUser, secretValue: string) {
  const payload = Buffer.from(JSON.stringify({ n: user.name, r: user.role, v: fingerprint(`${user.role}:${secretValue}`), x: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

// 요청마다 쿠키 서명·만료·비밀번호 지문을 확인합니다.
export async function getSession(request: Request): Promise<VisitUser | null> {
  try {
    const raw = readCookie(request, SESSION_COOKIE);
    if (!raw) return null;
    const [payload, signature] = raw.split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { n: string; r: VisitRole; v: string; x: number };
    if (!data || typeof data.x !== "number" || data.x < Date.now() / 1000) return null;
    const name = cleanName(data.n);
    if (!name || typeof data.v !== "string") return null;
    if (data.r === "admin") {
      const admin = adminPassword();
      return admin && safeEqual(data.v, fingerprint(`admin:${admin}`)) ? { name, role: "admin" } : null;
    }
    if (data.r !== "staff") return null;
    const hash = await getStaffHash();
    return hash && safeEqual(data.v, fingerprint(`staff:${hash}`)) ? { name, role: "staff" } : null;
  } catch {
    return null;
  }
}

// 다른 사이트에서 몰래 보내는 요청(CSRF)을 막기 위해, 데이터를 바꾸는 요청은 같은 사이트에서 온 것만 받습니다.
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return !!host && new URL(origin).host === host;
  } catch { return false; }
}

const attempts = new Map<string, number[]>();
export function takeLoginAttempt(key: string, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  for (const [k, list] of attempts) {
    const active = list.filter(time => now - time < windowMs);
    if (active.length) attempts.set(k, active); else attempts.delete(k);
  }
  if (attempts.size > 5000) { const oldest = attempts.keys().next().value; if (oldest) attempts.delete(oldest); }
  const recent = attempts.get(key) ?? [];
  if (recent.length >= max) return false;
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

// 틀린 비밀번호가 사이트 전체에서 1시간에 50번을 넘으면, 누군가 비밀번호를 알아내려는 것으로 보고 잠시 로그인을 막습니다.
const failures: number[] = [];
const FAIL_LIMIT = 50;
const FAIL_WINDOW = 60 * 60 * 1000;
function pruneFailures() { const cutoff = Date.now() - FAIL_WINDOW; while (failures.length && failures[0] < cutoff) failures.shift(); }
export function loginLocked() { pruneFailures(); return failures.length >= FAIL_LIMIT; }
export function noteLoginFailure() { pruneFailures(); failures.push(Date.now()); }

export async function logLogin(user: VisitUser) {
  try {
    const response = await freeBoardServiceRest("frck_visit_logins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: user.name, role: user.role }) });
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) { console.error("[visit-auth] login log failed", error instanceof Error ? error.message : error); }
}

export async function recentLogins(limit = 15) {
  const response = await freeBoardServiceRest(`frck_visit_logins?select=name,role,created_at&order=created_at.desc&limit=${limit}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return await response.json() as Array<{ name: string; role: VisitRole; created_at: string }>;
}

export const clientIp =(request: Request) => request.headers.get("x-real-ip")?.trim() || "unknown";
export { safeEqual, fingerprint };
