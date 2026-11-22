import { MAX_SHARE_BYTES, SHARE_TYPES, deleteObject, listShared, saveShared, shareReady, signShareManage, verifyShareManage } from "../../../lib/shared-resources";
import { isShareCategory } from "../../../lib/share-categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const siteUrl = "https://freerck.com";
const recent = new Map<string, number[]>();
const WINDOW = 60 * 60 * 1000;
const LIMIT = 6;

function tooMany(request: Request) {
  const who = request.headers.get("x-real-ip")?.trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(who) ?? []).filter(time => now - time < WINDOW);
  if (times.length >= LIMIT) return true;
  times.push(now); recent.set(who, times); return false;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

async function notifyAdmin(id: string, title: string, author: string) {
  const email = process.env.BOARD_ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const token = signShareManage(id);
  if (!email || !apiKey || !token) return;
  const manageUrl = `${siteUrl}/api/shared-resources/manage?id=${id}&token=${token}`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "자유개혁교회 <onboarding@resend.dev>",
        to: [email],
        subject: "[자유개혁교회] 성도 자료 나눔에 새 자료",
        text: `제목: ${title}\n올린 사람: ${author || "(이름 없음)"}\n관리자 삭제: ${manageUrl}`,
        html: `<p><b>${escapeHtml(title)}</b> 자료가 올라왔습니다. (올린 사람: ${escapeHtml(author || "이름 없음")})</p><p><a href="${manageUrl}">관리자 삭제</a></p><p>링크를 열면 확인 화면이 나오며, 확인 후 삭제됩니다.</p>`,
      }),
    });
  } catch (error) { console.error("[shared-resources] alert failed", error instanceof Error ? error.message : error); }
}

export async function GET() {
  if (!shareReady()) return Response.json({ items: [], ready: false });
  return Response.json({ items: await listShared(), ready: true });
}

export async function POST(request: Request) {
  if (!shareReady()) return Response.json({ error: "자료 저장소가 아직 준비되지 않았습니다. 관리자에게 알려 주세요." }, { status: 503 });
  if (tooMany(request)) return Response.json({ error: "잠시 뒤에 다시 올려 주세요." }, { status: 429 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "파일을 읽지 못했습니다." }, { status: 400 }); }
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const author = String(form.get("author") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  if (!(file instanceof File)) return Response.json({ error: "자료 파일을 골라 주세요." }, { status: 400 });
  if (title.length < 2 || title.length > 60) return Response.json({ error: "제목은 2자 이상 60자 이하로 적어 주세요." }, { status: 400 });
  if (description.length > 300) return Response.json({ error: "설명은 300자 이하로 적어 주세요." }, { status: 400 });
  if (author.length > 20) return Response.json({ error: "이름은 20자 이하로 적어 주세요." }, { status: 400 });
  if (!isShareCategory(category)) return Response.json({ error: "자료 종류를 골라 주세요." }, { status: 400 });
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!SHARE_TYPES[ext]) return Response.json({ error: "PDF, 사진(JPG·PNG·WEBP), 워드(docx), 한글(hwp·hwpx), 글자 파일(txt)만 올릴 수 있습니다." }, { status: 400 });
  if (file.size === 0) return Response.json({ error: "빈 파일입니다." }, { status: 400 });
  if (file.size > MAX_SHARE_BYTES) return Response.json({ error: "파일은 10MB 이하로 올려 주세요." }, { status: 400 });

  const saved = await saveShared({ title, description, category, author, filename: file.name.slice(0, 120), ext, bytes: await file.arrayBuffer() });
  if (!saved.ok) return Response.json({ error: saved.error }, { status: 500 });
  const manageToken = signShareManage(saved.id);
  await notifyAdmin(saved.id, saved.title, author);
  return Response.json({ ok: true, id: saved.id, manageToken, items: await listShared() });
}

export async function DELETE(request: Request) {
  if (!shareReady()) return Response.json({ error: "자료 저장소가 아직 준비되지 않았습니다." }, { status: 503 });
  let data: { id?: string; token?: string };
  try { data = await request.json(); } catch { return Response.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }
  if (typeof data.id !== "string" || !/^[\da-f-]{36}$/i.test(data.id) || typeof data.token !== "string" || !verifyShareManage(data.id, data.token)) return Response.json({ error: "이 자료를 삭제할 권한이 없습니다." }, { status: 403 });
  const item = (await listShared()).find(entry => entry.id === data.id);
  if (!item) return Response.json({ error: "이미 삭제되었거나 자료를 찾을 수 없습니다." }, { status: 404 });
  const results = await Promise.all([deleteObject(item.fileKey), deleteObject(item.metaKey)]);
  if (results.some(ok => !ok)) return Response.json({ error: "일부 파일을 삭제하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  return Response.json({ ok: true, items: await listShared() });
}
