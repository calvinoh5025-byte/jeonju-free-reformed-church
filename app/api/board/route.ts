import { supabaseRest } from "../../../lib/supabase-rest";
import { keyKind, moderationReady, serviceRest, signModeration } from "../../../lib/board-moderation";

const alertEmail = process.env.BOARD_ALERT_EMAIL;
const siteUrl = "https://jeonju-free-reformed-church.vercel.app";
const requests = new Map<string, number[]>();

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function moderationLink(id: number, action: "approve" | "delete") {
  const sig = signModeration(id, action);
  return sig ? `${siteUrl}/api/board/moderate?id=${id}&action=${action}&sig=${sig}` : null;
}

async function sendNewPostAlert(id: number | null, author: string, title: string, content: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!alertEmail || !apiKey) {
    console.error("[board-alert] BOARD_ALERT_EMAIL or RESEND_API_KEY is not set; skipping alert");
    return;
  }
  try {
    const approveUrl = id && moderationReady() ? moderationLink(id, "approve") : null;
    const deleteUrl = id && moderationReady() ? moderationLink(id, "delete") : null;
    const lines = [`제목: ${title}`, `작성자: ${author}`, "", content, ""];
    if (approveUrl && deleteUrl) lines.push(`공개하기(승인): ${approveUrl}`, `삭제하기: ${deleteUrl}`, "승인한 뒤에도 확인 화면의 '공개 취소하기' 버튼으로 언제든 되돌릴 수 있습니다.");
    else lines.push("지금은 메일에서 바로 승인할 수 없습니다. 관리자에게 알려 주세요.");
    const btn = (href: string, label: string, color: string, filled: boolean) => `<a href="${href}" style="display:block;text-align:center;${filled ? `background:${color};color:#fff;` : `background:#fff;color:${color};border:2px solid ${color};`}padding:16px;border-radius:12px;font-size:18px;font-weight:700;text-decoration:none;margin:0 0 12px">${label}</a>`;
    const buttons = approveUrl && deleteUrl
      ? `<div style="margin:24px 0">${btn(approveUrl, "공개하기 (승인)", "#1f5b45", true)}${btn(deleteUrl, "삭제하기", "#a12d2d", false)}</div><p style="color:#5b6475;font-size:15px">버튼을 누르면 확인 화면이 열리고, 한 번 더 누르면 처리됩니다. 승인한 뒤에도 그 화면의 <b>공개 취소하기</b> 버튼으로 언제든 되돌릴 수 있습니다.</p>`
      : `<p style="color:#a12d2d">지금은 메일에서 바로 승인할 수 없습니다. 관리자에게 알려 주세요.</p>`;
    const html = `<div style="font-family:sans-serif;line-height:1.7;color:#1d2433;max-width:560px"><h2 style="margin:0 0 12px">자유게시판에 새 글이 올라왔습니다</h2><p style="margin:0;color:#5b6475">작성자: ${escapeHtml(author)}</p><p style="margin:4px 0 12px"><strong>${escapeHtml(title)}</strong></p><div style="white-space:pre-wrap;background:#f4efe6;padding:14px;border-radius:10px">${escapeHtml(content)}</div>${buttons}</div>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "자유개혁교회 <onboarding@resend.dev>",
        to: [alertEmail],
        subject: "[자유개혁교회] 자유게시판 새 글 승인 요청",
        text: lines.join("\n"),
        html,
      }),
    });
    const result = await response.text();
    console.log(`[board-alert] resend status=${response.status} body=${result.slice(0, 300)}`);
  } catch (error) {
    // 알림 전송 실패가 방문자의 글 등록을 막지 않도록 합니다.
    console.error("[board-alert] resend request failed", error instanceof Error ? error.message : error);
  }
}

async function findNewPostId(author: string, title: string) {
  if (!moderationReady()) {
    console.error("[board-alert] SUPABASE_SERVICE_ROLE_KEY is not available; sending email without buttons");
    return null;
  }
  try {
    // 방금 저장한 승인 대기 글 가운데 가장 최근 것을 찾습니다.
    const query = `frck_board_posts?select=id,author,title&status=eq.pending&order=id.desc&limit=5`;
    const response = await serviceRest(query, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json() as Array<{ id: number; author: string; title: string }>;
    const match = rows.find(row => row.author === author && row.title === title) ?? null;
    console.log(`[board-alert] post id lookup status=${response.status} rows=${rows.length} matched=${match ? "yes" : "no"} key=${keyKind()}`);
    return match?.id ?? null;
  } catch (error) {
    console.error("[board-alert] could not find new post id", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function GET() {
  try {
    const response = await supabaseRest("frck_board_posts?select=id,author,title,content,created_at&status=eq.approved&order=created_at.desc,id.desc&limit=50", {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    } as RequestInit);
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json() as Array<{ id: number; author: string; title: string; content: string; created_at: string }>;
    const posts = rows.map(row => ({ id: row.id, author: row.author, title: row.title, content: row.content, createdAt: row.created_at }));
    return Response.json({ posts });
  } catch { return Response.json({ posts: [] }); }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    // Serverless 인스턴스마다 메모리가 분리되므로 완전한 전역 제한은 아닙니다.
    for (const [key, timestamps] of requests) {
      const active = timestamps.filter(time => now - time < 10 * 60 * 1000);
      if (active.length) requests.set(key, active);
      else requests.delete(key);
    }
    const recent = (requests.get(ip) ?? []).filter(time => now - time < 10 * 60 * 1000);
    if (recent.length >= 3) return Response.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
    recent.push(now); requests.set(ip, recent);
    const data = await request.json() as { author?: string; title?: string; content?: string; website?: string };
    if (data.website) return Response.json({ ok: true }, { status: 201 });
    const author = data.author?.trim().slice(0, 30) ?? "";
    const title = data.title?.trim().slice(0, 100) ?? "";
    const content = data.content?.trim().slice(0, 3000) ?? "";
    if (!author || !title || content.length < 2) return Response.json({ error: "이름, 제목, 내용을 모두 입력해 주세요." }, { status: 400 });
    const response = await supabaseRest("frck_board_posts", {
      method: "POST",
      headers: { "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ author, title, content, status: "pending", approved_at: null }),
    });
    if (!response.ok) throw new Error(await response.text());
    await sendNewPostAlert(await findNewPostId(author, title), author, title, content);
    return Response.json({ ok: true }, { status: 201 });
  } catch { return Response.json({ error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 }); }
}
