import { BULLETIN_TYPES, MAX_BULLETIN_BYTES, listBulletins, storageReady, uploadBulletin } from "../../../lib/bulletin-storage";

export const dynamic = "force-dynamic";

// 한 사람이 짧은 사이에 너무 많이 올리지 못하게 막습니다.
const recent = new Map<string, number[]>();
const WINDOW = 60 * 60 * 1000;
const LIMIT = 5;

function tooMany(request: Request) {
  const who = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(who) ?? []).filter(time => now - time < WINDOW);
  if (times.length >= LIMIT) return true;
  times.push(now);
  recent.set(who, times);
  return false;
}

export async function GET() {
  if (!storageReady()) return Response.json({ bulletins: [], ready: false });
  return Response.json({ bulletins: await listBulletins(), ready: true });
}

export async function POST(request: Request) {
  if (!storageReady()) return Response.json({ error: "주보 저장소가 아직 준비되지 않았습니다. 관리자에게 알려 주세요." }, { status: 503 });
  if (tooMany(request)) return Response.json({ error: "잠시 뒤에 다시 올려 주세요." }, { status: 429 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "파일을 읽지 못했습니다." }, { status: 400 }); }

  const file = form.get("file");
  const date = String(form.get("date") ?? "");
  if (!(file instanceof File)) return Response.json({ error: "주보 파일을 골라 주세요." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "주일 날짜를 골라 주세요." }, { status: 400 });
  if (Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) return Response.json({ error: "날짜가 올바르지 않습니다." }, { status: 400 });

  const extension = BULLETIN_TYPES[file.type];
  if (!extension) return Response.json({ error: "PDF 또는 사진(JPG·PNG·WEBP)만 올릴 수 있습니다." }, { status: 400 });
  if (file.size > MAX_BULLETIN_BYTES) return Response.json({ error: "파일이 너무 큽니다. 10MB 이하로 올려 주세요." }, { status: 400 });
  if (file.size === 0) return Response.json({ error: "빈 파일입니다." }, { status: 400 });

  const name = `${date}-${Date.now().toString(36)}.${extension}`;
  const result = await uploadBulletin(name, await file.arrayBuffer(), file.type);
  if (!result.ok) return Response.json({ error: result.error ?? "올리지 못했습니다." }, { status: 500 });
  return Response.json({ ok: true, url: result.url, bulletins: await listBulletins() });
}
