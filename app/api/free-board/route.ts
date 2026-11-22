import { freeBoardServiceRest, signFreeBoardManage, verifyFreeBoardManage } from "../../../lib/free-board-moderation";

const siteUrl = "https://freerck.com";
const DAILY_POST_LIMIT = 30;
const alertEmail = process.env.BOARD_ALERT_EMAIL;
const requests = new Map<string, number[]>();

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function takeRateLimit(ip: string) {
  const now = Date.now();
  for (const [key, timestamps] of requests) {
    const active = timestamps.filter(time => now - time < 10 * 60 * 1000);
    if (active.length) requests.set(key, active);
    else requests.delete(key);
  }
  if (requests.size > 5000) {
    const oldest = requests.keys().next().value;
    if (oldest) requests.delete(oldest);
  }
  const recent = requests.get(ip) ?? [];
  if (recent.length >= 3) return false;
  recent.push(now);
  requests.set(ip, recent);
  return true;
}

async function sendDeleteAlert(post: { id: number; author: string; title: string; content: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const signature = signFreeBoardManage(post.id);
  if (!alertEmail || !apiKey || !signature) return;
  const manageUrl = `${siteUrl}/api/free-board/moderate?id=${post.id}&sig=${signature}`;
  const html = `<div style="font-family:sans-serif;line-height:1.7;color:#1d2433;max-width:560px"><h2>자유게시판에 새 글이 게시되었습니다</h2><p>작성자: ${escapeHtml(post.author)}</p><p><strong>${escapeHtml(post.title)}</strong></p><div style="white-space:pre-wrap;background:#f4efe6;padding:14px;border-radius:10px">${escapeHtml(post.content)}</div><p><a href="${manageUrl}" style="display:inline-block;padding:12px 18px;background:#fff;color:#1d2433;border:2px solid #1d2433;border-radius:8px;font-weight:700;text-decoration:none">글 관리하기</a></p><p>링크를 열어 글을 수정하거나 삭제할 수 있습니다. 삭제는 확인 화면에서 한 번 더 선택해야 합니다.</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "자유개혁교회 <onboarding@resend.dev>",
        to: [alertEmail],
        subject: "[자유개혁교회] 자유게시판 새 글",
        text: `작성자: ${post.author}\n제목: ${post.title}\n\n${post.content}\n\n글 관리: ${manageUrl}`,
        html,
      }),
    });
    const result = await response.text();
    console.log(`[free-board-alert] resend status=${response.status} body=${result.slice(0, 250)}`);
  } catch (error) {
    console.error("[free-board-alert] resend request failed", error instanceof Error ? error.message : error);
  }
}

export async function GET() {
  try {
    const response = await freeBoardServiceRest("frck_free_posts?select=id,author,title,content,created_at&order=created_at.desc,id.desc&limit=100", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json() as Array<{ id: number; author: string; title: string; content: string; created_at: string }>;
    return Response.json({ posts: rows.map(row => ({ id: row.id, author: row.author, title: row.title, content: row.content, createdAt: row.created_at })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[free-board] list failed", error instanceof Error ? error.message : error);
    return Response.json({ posts: [], error: "게시글을 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let data: { author?: string; title?: string; content?: string; website?: string };
  try { data = await request.json(); }
  catch { return Response.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }
  if (!data || typeof data !== "object") return Response.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 });
  if (data.website) return Response.json({ ok: true }, { status: 201 });

  if (typeof data.author !== "string" || typeof data.title !== "string" || typeof data.content !== "string") {
    return Response.json({ error: "이름, 제목, 내용을 확인해 주세요." }, { status: 400 });
  }
  const author = data.author.trim().slice(0, 30);
  const title = data.title.trim().slice(0, 100);
  const content = data.content.trim().slice(0, 3000);
  if (!author || !title || content.length < 2) return Response.json({ error: "이름, 제목, 내용을 모두 입력해 주세요." }, { status: 400 });

  // Vercel supplies x-real-ip. Avoid trusting caller-controlled x-forwarded-for values.
  const ip = request.headers.get("x-real-ip")?.trim() || "unknown";
  if (!takeRateLimit(ip)) return Response.json({ error: "10분 동안 등록할 수 있는 횟수를 넘었습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const response = await freeBoardServiceRest(`frck_free_posts?select=id&created_at=gte.${encodeURIComponent(since)}&limit=${DAILY_POST_LIMIT}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const recentPosts = await response.json() as Array<{ id: number }>;
    if (recentPosts.length >= DAILY_POST_LIMIT) {
      return Response.json({ error: "오늘은 게시판 등록이 많아 잠시 닫혀 있습니다. 내일 다시 시도해 주세요." }, { status: 429 });
    }
  } catch (error) {
    console.error("[free-board] daily post limit check failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "글 등록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }

  try {
    const response = await freeBoardServiceRest("frck_free_posts?select=id,author,title,content,created_at", {
      method: "POST",
      headers: { "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ author, title, content }),
    });
    if (!response.ok) throw new Error(await response.text());
    const [post] = await response.json() as Array<{ id: number; author: string; title: string; content: string; created_at: string }>;
    if (!post) throw new Error("Supabase did not return the inserted post");
    await sendDeleteAlert({ id: post.id, author: post.author, title: post.title, content: post.content });
    return Response.json({ ok: true, post: { id: post.id, createdAt: post.created_at }, manageToken: signFreeBoardManage(post.id) }, { status: 201 });
  } catch (error) {
    console.error("[free-board] create failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}

type ManageRequest = { id?: number; token?: string; author?: string; title?: string; content?: string };
async function parseManageRequest(request: Request): Promise<ManageRequest | null> {
  try {
    const data = await request.json();
    return data && typeof data === "object" ? data as ManageRequest : null;
  } catch { return null; }
}
function canManage(data: ManageRequest | null): data is ManageRequest & { id: number; token: string } {
  return !!data && Number.isSafeInteger(data.id) && (data.id ?? 0) > 0 && typeof data.token === "string" && verifyFreeBoardManage(data.id!, data.token);
}

export async function PATCH(request: Request) {
  const data = await parseManageRequest(request);
  if (!canManage(data)) return Response.json({ error: "이 글을 수정할 권한이 없습니다." }, { status: 403 });
  if (typeof data.author !== "string" || typeof data.title !== "string" || typeof data.content !== "string") return Response.json({ error: "이름, 제목, 내용을 확인해 주세요." }, { status: 400 });
  const author = data.author.trim().slice(0, 30);
  const title = data.title.trim().slice(0, 100);
  const content = data.content.trim().slice(0, 3000);
  if (!author || !title || content.length < 2) return Response.json({ error: "이름, 제목, 내용을 모두 입력해 주세요." }, { status: 400 });
  try {
    const response = await freeBoardServiceRest(`frck_free_posts?id=eq.${data.id}&select=id,author,title,content,created_at`, {
      method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ author, title, content }),
    });
    if (!response.ok) throw new Error(await response.text());
    const [post] = await response.json() as Array<{ id: number; author: string; title: string; content: string; created_at: string }>;
    if (!post) return Response.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ ok: true, post: { id: post.id, author: post.author, title: post.title, content: post.content, createdAt: post.created_at } });
  } catch (error) {
    console.error("[free-board] update failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const data = await parseManageRequest(request);
  if (!canManage(data)) return Response.json({ error: "이 글을 삭제할 권한이 없습니다." }, { status: 403 });
  try {
    const response = await freeBoardServiceRest(`frck_free_posts?id=eq.${data.id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!response.ok) throw new Error(await response.text());
    const deleted = await response.json() as Array<{ id: number }>;
    if (!deleted.length) return Response.json({ error: "이미 삭제되었거나 글을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[free-board] delete failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
