import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { freeBoardServiceRest } from "./free-board-moderation";

// 심방 일정 로그인. 회원가입은 없고, 관리자가 등록한 계정만 로그인할 수 있습니다.
// - 관리자: 환경변수 VISIT_ADMIN_EMAIL / VISIT_ADMIN_PASSWORD 로 로그인 (설정하지 않으면 관리자 기능은 꺼져 있음)
// - 장로(elder, 목사 포함) / 집사(deacon): frck_visit_staff 테이블의 계정
export type VisitRole = "admin" | "elder" | "deacon";
export type VisitUser = { email: string; name: string; role: VisitRole };

export const SESSION_COOKIE = "frck_visit_session";
const SESSION_SECONDS = 14 * 24 * 60 * 60;

function secret() {
  const value = process.env.VISIT_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.length < 16) throw new Error("session secret is not configured");
  return value;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(`frck-visit-session:${payload}`).digest("base64url");

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
  // 계정이 없을 때도 같은 시간이 걸리도록 항상 계산합니다.
  const parts = (stored ?? "").split("$");
  const valid = parts.length === 3 && parts[0] === "s1" && /^[a-f0-9]+$/.test(parts[1]) && /^[a-f0-9]+$/.test(parts[2]);
  const salt = Buffer.from(valid ? parts[1] : "00".repeat(16), "hex");
  const expected = Buffer.from(valid ? parts[2] : "00".repeat(64), "hex");
  const actual = scryptSync(password, salt, expected.length || 64);
  return valid && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function adminConfig() {
  const email = process.env.VISIT_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.VISIT_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) return null;
  return { email, password };
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,50}$/.test(email) && email.length <= 200 ? email : null;
}

export function createSessionCookie(user: VisitUser) {
  const payload = Buffer.from(JSON.stringify({ e: user.email, n: user.name, r: user.role, x: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
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

type StaffRow = { id: number; email: string; name: string; role: "elder" | "deacon"; active: boolean; password_hash: string };

export async function findStaff(email: string): Promise<StaffRow | null> {
  const response = await freeBoardServiceRest(`frck_visit_staff?select=id,email,name,role,active,password_hash&email=eq.${encodeURIComponent(email)}&limit=1`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`staff lookup failed: ${response.status}`);
  const rows = await response.json() as StaffRow[];
  return rows[0] ?? null;
}

// 요청마다 쿠키 서명과 만료를 확인하고, 일반 계정은 DB에서 아직 활성 상태인지 다시 확인합니다.
// (퇴임·비활성화한 계정은 로그인 상태가 남아 있어도 바로 막힙니다.)
export async function getSession(request: Request): Promise<VisitUser | null> {
  try {
    const raw = readCookie(request, SESSION_COOKIE);
    if (!raw) return null;
    const [payload, signature] = raw.split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { e: string; n: string; r: VisitRole; x: number };
    if (!data || typeof data.e !== "string" || typeof data.x !== "number" || data.x < Date.now() / 1000) return null;
    if (data.r === "admin") {
      const admin = adminConfig();
      return admin && admin.email === data.e ? { email: data.e, name: data.n || "관리자", role: "admin" } : null;
    }
    if (data.r !== "elder" && data.r !== "deacon") return null;
    const staff = await findStaff(data.e);
    if (!staff || !staff.active || staff.role !== data.r) return null;
    return { email: staff.email, name: staff.name, role: staff.role };
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
export function takeLoginAttempt(key: string, max = 8, windowMs = 10 * 60 * 1000) {
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

export const canSeeDetails = (user: VisitUser, createdBy: string | null) => user.role !== "deacon" || createdBy === user.email;
export const canEditVisit = canSeeDetails;
export const clientIp = (request: Request) => request.headers.get("x-real-ip")?.trim() || "unknown";
export { safeEqual };
