export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ error: "게시판 관리는 Supabase 대시보드에서 이용해 주세요." }, { status: 501 });
}
export async function PATCH() {
  return Response.json({ error: "게시판 관리는 Supabase 대시보드에서 이용해 주세요." }, { status: 501 });
}
