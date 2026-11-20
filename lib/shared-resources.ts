import { createHmac, timingSafeEqual } from "crypto";

// 성도 자료 나눔: 누구나 올리는 자료는 Supabase Storage의 공개 버킷에 둡니다.
// 자료마다 파일 하나와, 제목·설명을 담은 작은 JSON 파일(메타)이 한 쌍입니다.
export const SHARE_BUCKET = "frck-shared-resources";
export const MAX_SHARE_BYTES = 10 * 1024 * 1024;
export const MAX_SHARE_ITEMS = 60;

// 확장자로만 허용합니다. 실행 파일이나 웹 문서는 받지 않습니다.
export const SHARE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
  hwp: "application/octet-stream",
  hwpx: "application/octet-stream",
};

export type SharedResource = {
  id: string;
  title: string;
  description: string;
  author: string;
  filename: string;
  size: number;
  createdAt: string;
  url: string;
  fileKey: string;
  metaKey: string;
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

export const shareReady = () => config() !== null;

export function signShareManage(id: string) {
  const key = serverKey();
  return key ? createHmac("sha256", key).update(`frck-shared-resource:${id}:manage`).digest("hex") : null;
}

export function verifyShareManage(id: string, signature: string) {
  const expected = signShareManage(id);
  return !!expected && signature.length === expected.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const publicUrl = (key: string) => `${process.env.SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/${SHARE_BUCKET}/${encodeURIComponent(key)}`;
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

async function ensureBucket(url: string, key: string) {
  const json = { ...headers(key), "content-type": "application/json" };
  const found = await fetch(`${url}/storage/v1/bucket/${SHARE_BUCKET}`, { headers: json, cache: "no-store" });
  if (found.ok) return true;
  const made = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ id: SHARE_BUCKET, name: SHARE_BUCKET, public: true, file_size_limit: MAX_SHARE_BYTES }),
  });
  return made.ok || made.status === 409;
}

async function putObject(key: string, body: BodyInit, contentType: string) {
  const setup = config();
  if (!setup) return false;
  const response = await fetch(`${setup.url}/storage/v1/object/${SHARE_BUCKET}/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { ...headers(setup.key), "content-type": contentType, "x-upsert": "false" },
    body,
  });
  return response.ok;
}

export async function deleteObject(key: string) {
  const setup = config();
  if (!setup) return false;
  const response = await fetch(`${setup.url}/storage/v1/object/${SHARE_BUCKET}/${encodeURIComponent(key)}`, { method: "DELETE", headers: headers(setup.key) });
  return response.ok || response.status === 404;
}

export async function listShared(): Promise<SharedResource[]> {
  const setup = config();
  if (!setup) return [];
  const response = await fetch(`${setup.url}/storage/v1/object/list/${SHARE_BUCKET}`, {
    method: "POST",
    headers: { ...headers(setup.key), "content-type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 400, offset: 0, sortBy: { column: "name", order: "desc" } }),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as { name: string }[];
  const metas = rows.map(row => row.name).filter(name => /^\d{13}-[\da-f-]{36}\.json$/i.test(name)).slice(0, MAX_SHARE_ITEMS);
  const loaded = await Promise.all(metas.map(async metaKey => {
    try {
      const meta = await fetch(publicUrl(metaKey), { cache: "no-store" });
      if (!meta.ok) return null;
      const data = (await meta.json()) as Omit<SharedResource, "url" | "metaKey">;
      return { ...data, metaKey, url: publicUrl(data.fileKey) } as SharedResource;
    } catch { return null; }
  }));
  return loaded.filter((item): item is SharedResource => item !== null);
}

export async function saveShared(input: { title: string; description: string; author: string; filename: string; ext: string; bytes: ArrayBuffer }) {
  const setup = config();
  if (!setup) return { ok: false as const, error: "자료 저장소가 아직 준비되지 않았습니다." };
  if (!(await ensureBucket(setup.url, setup.key))) return { ok: false as const, error: "저장소를 준비하지 못했습니다." };
  const id = crypto.randomUUID();
  const stamp = String(Date.now()).padStart(13, "0");
  const fileKey = `${stamp}-${id}-file.${input.ext}`;
  const metaKey = `${stamp}-${id}.json`;
  if (!(await putObject(fileKey, input.bytes, SHARE_TYPES[input.ext]))) return { ok: false as const, error: "파일을 올리지 못했습니다." };
  const meta = { id, title: input.title, description: input.description, author: input.author, filename: input.filename, size: input.bytes.byteLength, createdAt: new Date().toISOString(), fileKey };
  if (!(await putObject(metaKey, JSON.stringify(meta), "application/json"))) {
    await deleteObject(fileKey);
    return { ok: false as const, error: "자료 정보를 저장하지 못했습니다." };
  }
  return { ok: true as const, id, title: input.title };
}
