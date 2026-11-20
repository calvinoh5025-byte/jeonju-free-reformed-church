// 주보 파일은 Supabase Storage의 공개 버킷에 둡니다.
// 업로드는 서버에서만 하므로 관리용 키를 씁니다.

export const BULLETIN_BUCKET = "frck-bulletins";
export const MAX_BULLETIN_BYTES = 10 * 1024 * 1024;

export const BULLETIN_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function serverKey() {
  const candidates = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY];
  return candidates.find(key => key && (key.startsWith("sb_secret_") || key.startsWith("eyJ"))) ?? null;
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = serverKey();
  if (!url || !key) return null;
  return { url, key };
}

export const storageReady = () => config() !== null;

export function publicUrl(name: string) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/${BULLETIN_BUCKET}/${encodeURIComponent(name)}`;
}

async function ensureBucket(url: string, key: string) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
  const found = await fetch(`${url}/storage/v1/bucket/${BULLETIN_BUCKET}`, { headers, cache: "no-store" });
  if (found.ok) return true;
  const made = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: BULLETIN_BUCKET,
      name: BULLETIN_BUCKET,
      public: true,
      file_size_limit: MAX_BULLETIN_BYTES,
      allowed_mime_types: Object.keys(BULLETIN_TYPES),
    }),
  });
  // 다른 요청이 먼저 만들었으면 409가 오는데, 그것도 준비된 상태입니다.
  return made.ok || made.status === 409;
}

export type Bulletin = { name: string; date: string; url: string; size: number };

const dateOf = (name: string) => name.slice(0, 10);

export async function listBulletins(): Promise<Bulletin[]> {
  const setup = config();
  if (!setup) return [];
  const { url, key } = setup;
  const response = await fetch(`${url}/storage/v1/object/list/${BULLETIN_BUCKET}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 100, offset: 0, sortBy: { column: "name", order: "desc" } }),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as { name: string; metadata?: { size?: number } }[];
  return rows
    .filter(row => /^\d{4}-\d{2}-\d{2}/.test(row.name))
    .sort((a, b) => (a.name < b.name ? 1 : -1))
    .map(row => ({ name: row.name, date: dateOf(row.name), url: publicUrl(row.name), size: row.metadata?.size ?? 0 }));
}

export async function uploadBulletin(name: string, body: ArrayBuffer, contentType: string) {
  const setup = config();
  if (!setup) return { ok: false, error: "저장소가 아직 준비되지 않았습니다." };
  const { url, key } = setup;
  if (!(await ensureBucket(url, key))) return { ok: false, error: "저장소를 준비하지 못했습니다." };
  const response = await fetch(`${url}/storage/v1/object/${BULLETIN_BUCKET}/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": contentType, "x-upsert": "false" },
    body,
  });
  if (!response.ok) return { ok: false, error: (await response.text()).slice(0, 200) };
  return { ok: true, url: publicUrl(name) };
}
