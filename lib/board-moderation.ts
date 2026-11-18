import { createHmac, timingSafeEqual } from "crypto";

export type ModerationAction = "approve" | "delete";

const getServiceConfig = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
};

export const moderationReady = () => getServiceConfig() !== null;

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
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, ...init.headers },
  });
}
