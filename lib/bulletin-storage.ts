import { createHmac, timingSafeEqual } from "crypto";

// 주보 파일은 Supabase Storage의 공개 버킷에 둡니다. 업로드와 삭제는 서버에서만 합니다.
export const BULLETIN_BUCKET = "frck-bulletins";
export const MAX_BULLETIN_BYTES = 10 * 1024 * 1024;
export const BULLETIN_TYPES: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

function serverKey() {
  const candidates = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY];
  return candidates.find(key => key && (key.startsWith("sb_secret_") || key.startsWith("eyJ"))) ?? null;
}
function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = serverKey();
  return url && key ? { url, key } : null;
}
export const storageReady = () => config() !== null;

export function signBulletinManage(id: string) {
  const key = serverKey();
  return key ? createHmac("sha256", key).update(`frck-bulletin:${id}:manage`).digest("hex") : null;
}
export function verifyBulletinManage(id: string, signature: string) {
  const expected = signBulletinManage(id);
  return !!expected && signature.length === expected.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function publicUrl(name: string) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${BULLETIN_BUCKET}/${encodeURIComponent(name)}` : "";
}
async function ensureBucket(url: string, key: string) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
  const found = await fetch(`${url}/storage/v1/bucket/${BULLETIN_BUCKET}`, { headers, cache: "no-store" });
  if (found.ok) return true;
  const made = await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers, body: JSON.stringify({ id: BULLETIN_BUCKET, name: BULLETIN_BUCKET, public: true, file_size_limit: MAX_BULLETIN_BYTES, allowed_mime_types: Object.keys(BULLETIN_TYPES) }) });
  return made.ok || made.status === 409;
}

export type BulletinPage = { name: string; url: string; size: number };
export type Bulletin = { id: string; date: string; pages: BulletinPage[] };
export async function listBulletins(): Promise<Bulletin[]> {
  const setup = config();
  if (!setup) return [];
  const response = await fetch(`${setup.url}/storage/v1/object/list/${BULLETIN_BUCKET}`, {
    method: "POST", headers: { apikey: setup.key, Authorization: `Bearer ${setup.key}`, "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 100, offset: 0, sortBy: { column: "name", order: "desc" } }), cache: "no-store",
  });
  if (!response.ok) return [];
  const rows = await response.json() as { name: string; metadata?: { size?: number } }[];
  const groups = new Map<string, Bulletin>();
  for (const row of rows) {
    // 새 파일은 날짜-batchId-p1.ext 형식. 기존 날짜-타임스탬프.ext도 표시합니다.
    const batch = row.name.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)-p\d+\.[a-z0-9]+$/i);
    const legacy = row.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.[a-z0-9]+$/i);
    if (!batch && !legacy) continue;
    const date = (batch ?? legacy)![1];
    const id = batch ? batch[2] : row.name;
    const item = groups.get(id) ?? { id, date, pages: [] };
    item.pages.push({ name: row.name, url: publicUrl(row.name), size: row.metadata?.size ?? 0 });
    groups.set(id, item);
  }
  return [...groups.values()].map(item => ({ ...item, pages: item.pages.sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function storageHeaders(key: string) { return { apikey: key, Authorization: `Bearer ${key}` }; }
export async function uploadBulletin(name: string, body: ArrayBuffer, contentType: string) {
  const setup = config();
  if (!setup) return { ok: false, error: "저장소가 아직 준비되지 않았습니다." };
  if (!(await ensureBucket(setup.url, setup.key))) return { ok: false, error: "저장소를 준비하지 못했습니다." };
  const response = await fetch(`${setup.url}/storage/v1/object/${BULLETIN_BUCKET}/${encodeURIComponent(name)}`, { method: "POST", headers: { ...storageHeaders(setup.key), "content-type": contentType, "x-upsert": "false" }, body });
  if (!response.ok) return { ok: false, error: (await response.text()).slice(0, 200) };
  return { ok: true, url: publicUrl(name) };
}
export async function deleteBulletinObject(name: string) {
  const setup = config();
  if (!setup) return false;
  const response = await fetch(`${setup.url}/storage/v1/object/${BULLETIN_BUCKET}/${encodeURIComponent(name)}`, { method: "DELETE", headers: storageHeaders(setup.key) });
  return response.ok || response.status === 404;
}
