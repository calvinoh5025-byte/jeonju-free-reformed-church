import { supabaseRest } from "../../../lib/supabase-rest";

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

export async function POST() { return Response.json({ error: "공지게시판에는 글을 등록할 수 없습니다." }, { status: 405 }); }
