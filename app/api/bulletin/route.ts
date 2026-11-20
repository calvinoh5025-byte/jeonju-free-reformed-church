import { BULLETIN_TYPES, MAX_BULLETIN_BYTES, deleteBulletinObject, listBulletins, signBulletinManage, storageReady, uploadBulletin, verifyBulletinManage } from "../../../lib/bulletin-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const recent = new Map<string, number[]>();
const WINDOW = 60 * 60 * 1000;
const LIMIT = 5;
const siteUrl = "https://jeonju-free-reformed-church.vercel.app";
function tooMany(request: Request) {
  const who = request.headers.get("x-real-ip")?.trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(who) ?? []).filter(time => now - time < WINDOW);
  if (times.length >= LIMIT) return true;
  times.push(now); recent.set(who, times); return false;
}
// pdfjs는 서버에서 불러오다 실패할 수 있으므로 필요할 때만, 그리고 실패해도 요청 전체가
// 죽지 않도록 감싸서 가져옵니다. 쪽수를 셀 수 없으면 쪽수 제한만 건너뜁니다.
type PdfCheck = { pages: number } | { pages: null; reason: "unavailable" | "unreadable" };

async function pdfPageCount(file: File): Promise<PdfCheck> {
  let getDocument: typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument;
  try {
    ({ getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs"));
  } catch (error) {
    console.error("[bulletin] pdfjs unavailable", error instanceof Error ? error.message : error);
    return { pages: null, reason: "unavailable" };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false });
  try {
    const pdf = await task.promise;
    return { pages: pdf.numPages };
  } catch { return { pages: null, reason: "unreadable" }; }
  finally { await task.destroy(); }
}
async function notifyBulletinAdmin(date: string, id: string, token: string, pageCount: number) {
  const email = process.env.BOARD_ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!email || !apiKey) return;
  const manageUrl = `${siteUrl}/api/bulletin/manage?id=${id}&token=${token}`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: "자유개혁교회 <onboarding@resend.dev>", to: [email], subject: "[자유개혁교회] 새 주보 등록", text: `${date} 주보 ${pageCount}쪽이 등록되었습니다. 관리자 삭제: ${manageUrl}`, html: `<p>${date} 주보 ${pageCount}쪽이 등록되었습니다.</p><p><a href="${manageUrl}">관리자 주보 삭제</a></p><p>링크를 열면 확인 화면이 나오며, 확인 후 삭제됩니다.</p>` }),
    });
  } catch (error) { console.error("[bulletin-alert] email request failed", error instanceof Error ? error.message : error); }
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
  const files = [...form.getAll("files"), ...form.getAll("file")].filter((value): value is File => value instanceof File);
  const date = String(form.get("date") ?? "");
  if (files.length < 1 || files.length > 2) return Response.json({ error: "주보는 최대 2페이지까지 올릴 수 있습니다." }, { status: 400 });
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return Response.json({ error: "주일 날짜를 확인해 주세요." }, { status: 400 });
  if (files.some(file => !BULLETIN_TYPES[file.type])) return Response.json({ error: "PDF 또는 사진(JPG·PNG·WEBP)만 올릴 수 있습니다." }, { status: 400 });
  if (files.some(file => file.size === 0)) return Response.json({ error: "빈 파일입니다." }, { status: 400 });
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_BULLETIN_BYTES) return Response.json({ error: "파일 전체 크기는 10MB 이하로 올려 주세요." }, { status: 400 });
  if (files.length > 1 && files.some(file => file.type === "application/pdf")) return Response.json({ error: "PDF는 한 파일에 최대 2페이지를 담아 올려 주세요. 사진은 최대 2장까지 올릴 수 있습니다." }, { status: 400 });
  let pdfPages: number | null = null;
  // 쪽수를 셀 수 없는 환경이면 올리기를 막지 않고 쪽수 제한만 건너뜁니다.
  if (files.length === 1 && files[0].type === "application/pdf") {
    const check = await pdfPageCount(files[0]);
    if (check.pages === null && check.reason === "unreadable") return Response.json({ error: "PDF를 읽지 못했습니다. 다른 파일로 올려 주세요." }, { status: 400 });
    if (check.pages !== null && (check.pages < 1 || check.pages > 2)) return Response.json({ error: "주보는 2페이지까지 올릴 수 있습니다." }, { status: 400 });
    pdfPages = check.pages;
  }

  const id = crypto.randomUUID();
  const uploaded: string[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const name = `${date}-${id}-p${index + 1}.${BULLETIN_TYPES[file.type]}`;
    const result = await uploadBulletin(name, await file.arrayBuffer(), file.type);
    if (!result.ok) {
      await Promise.all(uploaded.map(deleteBulletinObject));
      return Response.json({ error: result.error ?? "올리지 못했습니다." }, { status: 500 });
    }
    uploaded.push(name);
  }
  const manageToken = signBulletinManage(id);
  if (!manageToken) {
    await Promise.all(uploaded.map(deleteBulletinObject));
    return Response.json({ error: "삭제 권한을 준비하지 못했습니다." }, { status: 503 });
  }
  await notifyBulletinAdmin(date, id, manageToken, pdfPages ?? files.length);
  return Response.json({ ok: true, id, manageToken, bulletins: await listBulletins() });
}

export async function DELETE(request: Request) {
  if (!storageReady()) return Response.json({ error: "주보 저장소가 아직 준비되지 않았습니다." }, { status: 503 });
  let data: { id?: string; token?: string };
  try { data = await request.json(); } catch { return Response.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }
  if (typeof data.id !== "string" || !/^[\da-f-]{36}$/i.test(data.id) || typeof data.token !== "string" || !verifyBulletinManage(data.id, data.token)) return Response.json({ error: "이 주보를 삭제할 권한이 없습니다." }, { status: 403 });
  const bulletin = (await listBulletins()).find(item => item.id === data.id);
  if (!bulletin) return Response.json({ error: "이미 삭제되었거나 주보를 찾을 수 없습니다." }, { status: 404 });
  const results = await Promise.all(bulletin.pages.map(page => deleteBulletinObject(page.name)));
  if (results.some(result => !result)) return Response.json({ error: "일부 파일을 삭제하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  return Response.json({ ok: true, bulletins: await listBulletins() });
}
