import { createHmac, timingSafeEqual } from "crypto";

export type ModerationAction = "approve" | "unapprove" | "delete";

// Supabase–Vercel 연동이 넣어 주는 SUPABASE_SECRET_KEY를 먼저 쓰고, 없으면 직접 넣은 키를 씁니다.
// 공개용 키(sb_publishable_)는 관리 작업에 쓸 수 없으므로 무시합니다.
function serverKey() {
  const candidates = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY];
  return candidates.find(key => key && (key.startsWith("sb_secret_") || key.startsWith("eyJ"))) ?? null;
}

const getServiceConfig = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = serverKey();
  if (!url || !key) return null;
  return { url, key };
};

export const moderationReady = () => getServiceConfig() !== null;

// 진단용: 키 값은 기록하지 않고 종류만 알려 줍니다.
export function keyKind() {
  const key = serverKey() ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "publishable(wrong key)";
  if (key.startsWith("eyJ")) return "legacy-jwt";
  return key ? "unknown" : "missing";
}

// 승인 링크가 위조되지 않도록 서버 비밀값으로 서명합니다.
export function signModeration(id: number, action: ModerationAction) {
  const config = getServiceConfig();
  if (!config) return null;
  return createHmac("sha256", config.key).update(`frck-board:${id}:${action}`).digest("hex");
}

export function verifyModeration(id: number, action: ModerationAction, signature: string) {
  const expected = signModeration(id, action);
  if (!expected || signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function serviceRest(path: string, init: RequestInit = {}) {
  const config = getServiceConfig();
  if (!config) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    // 새 형식 비밀 키(sb_secret_)는 apikey 헤더로만 보냅니다. 예전 JWT 형식은 Authorization도 함께 보냅니다.
    headers: { apikey: config.key, ...(config.key.startsWith("sb_") ? {} : { Authorization: `Bearer ${config.key}` }), ...init.headers },
  });
}
