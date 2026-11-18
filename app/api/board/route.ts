import { supabaseRest } from "../../../lib/supabase-rest";

const alertEmail = "calvinoh5025@gmail.com";
const adminBoardUrl = "https://supabase.com/dashboard/project/eipsircytjjzypolrtie/editor";

async function sendNewPostAlert(author: string, title: string, content: string) {
  try {
    await fetch(`https://formsubmit.co/ajax/${alertEmail}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        _subject: "[자유개혁교회] 자유게시판 새 글 승인 요청",
        _template: "table",
        _captcha: "false",
        제목: title,
        작성자: author,
        본문: content,
        "승인 페이지": adminBoardUrl,
      }),
    });
  } catch {
    // 알림 전송 실패가 방문자의 글 등록을 막지 않도록 합니다.
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
