import { supabaseRest } from "../../../lib/supabase-rest";

const alertEmail = process.env.BOARD_ALERT_EMAIL;
const adminBoardUrl = process.env.BOARD_ADMIN_URL;
const requests = new Map<string, number[]>();

async function sendNewPostAlert(author: string, title: string, content: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!alertEmail || !apiKey) {
    console.error("[board-alert] BOARD_ALERT_EMAIL or RESEND_API_KEY is not set; skipping alert");
    return;
  }
  try {
    const lines = [`제목: ${title}`, `작성자: ${author}`, "", content];
    if (adminBoardUrl) lines.push("", `승인 페이지: ${adminBoardUrl}`);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "자유개혁교회 <onboarding@resend.dev>",
        to: [alertEmail],
        subject: "[자유개혁교회] 자유게시판 새 글 승인 요청",
        text: lines.join("\n"),
      }),
    });
    const result = await response.text();
    console.log(`[board-alert] resend status=${response.status} body=${result.slice(0, 300)}`);
  } catch (error) {
    // 알림 전송 실패가 방문자의 글 등록을 막지 않도록 합니다.
    console.error("[board-alert] resend request failed", error instanceof Error ? error.message : error);
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
    await sendNewPostAlert(author, title, content);
    return Response.json({ ok: true }, { status: 201 });
  } catch { return Response.json({ error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 }); }
}
