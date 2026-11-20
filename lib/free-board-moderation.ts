import { createHmac, timingSafeEqual } from "crypto";

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const candidates = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY];
  const key = candidates.find(value => value && (value.startsWith("sb_secret_") || value.startsWith("eyJ")));
  if (!url || !key) return null;
  return { url, key };
}

export function signFreeBoardDelete(id: number) {
  const config = getConfig();
  if (!config) return null;
  return createHmac("sha256", config.key).update(`frck-free-board:${id}:delete`).digest("hex");
}

export function signFreeBoardManage(id: number) {
  const config = getConfig();
  if (!config) return null;
  return createHmac("sha256", config.key).update(`frck-free-board:${id}:manage`).digest("hex");
}

export function verifyFreeBoardManage(id: number, signature: string) {
  const expected = signFreeBoardManage(id);
  return !!expected && /^[a-f0-9]{64}$/.test(signature) && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyFreeBoardDelete(id: number, signature: string) {
  const expected = signFreeBoardDelete(id);
  if (!expected || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function freeBoardServiceRest(path: string, init: RequestInit = {}) {
  const config = getConfig();
  if (!config) throw new Error("Supabase server key is not configured");
  return fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      ...(config.key.startsWith("sb_") ? {} : { Authorization: `Bearer ${config.key}` }),
      ...init.headers,
    },
  });
}
