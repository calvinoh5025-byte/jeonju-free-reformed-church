import { freeBoardServiceRest, signFreeBoardDelete } from "../../../lib/free-board-moderation";

const siteUrl = "https://jeonju-free-reformed-church.vercel.app";
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
  const signature = signFreeBoardDelete(post.id);
  if (!alertEmail || !apiKey || !signature) return;
  const deleteUrl = `${siteUrl}/api/free-board/moderate?id=${post.id}&sig=${signature}`;
  const html = `<div style="font-family:sans-serif;line-height:1.7;color:#1d2433;max-width:560px"><h2>자유게시판에 새 글이 게시되었습니다</h2><p>작성자: ${escapeHtml(post.author)}</p><p><strong>${escapeHtml(post.title)}</strong></p><div style="white-space:pre-wrap;background:#f4efe6;padding:14px;border-radius:10px">${escapeHtml(post.content)}</div><p><a href="${deleteUrl}" style="display:inline-block;padding:12px 18px;background:#fff;color:#a12d2d;border:2px solid #a12d2d;border-radius:8px;font-weight:700;text-decoration:none">삭제 검토하기</a></p><p>링크를 열면 확인 화면이 표시됩니다. 확인 화면에서 한 번 더 선택해야 글이 삭제됩니다.</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "자유개혁교회 <onboarding@resend.dev>",
        to: [alertEmail],
        subject: "[자유개혁교회] 자유게시판 새 글",
        text: `작성자: ${post.author}\n제목: ${post.title}\n\n${post.content}\n\n삭제 검토: ${deleteUrl}`,
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
    return Response.json({ ok: true, post: { id: post.id, createdAt: post.created_at } }, { status: 201 });
  } catch (error) {
    console.error("[free-board] create failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
