import { freeBoardServiceRest } from "../../../lib/free-board-moderation";

// 공개 API: 성도(비로그인)에게 보여도 되는 정보만 돌려줍니다.
// 반드시 아래 컬럼만 명시적으로 고릅니다. select=* 를 쓰지 마세요(가정 이름, 담당 장로, 메모는 비공개).
const PUBLIC_COLUMNS = "id,starts_at,kind,pastor,status";

type Row = { id: number; starts_at: string; kind: "elder" | "deacon"; pastor: boolean; status: "scheduled" | "done" };

export async function GET() {
  const from = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const response = await freeBoardServiceRest(
      `frck_visits?select=${PUBLIC_COLUMNS}&status=in.(scheduled,done)&starts_at=gte.${encodeURIComponent(from)}&starts_at=lte.${encodeURIComponent(to)}&order=starts_at.asc&limit=500`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`status ${response.status}`);
    const rows = await response.json() as Row[];
    const slots = rows.map(row => ({
      id: String(row.id),
      starts_at: row.starts_at,
      kind: row.kind === "deacon" ? "deacon" : "elder",
      pastor: row.pastor === true,
      done: row.status === "done",
    }));
    return Response.json({ slots }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("[visit-slots] list failed", error instanceof Error ? error.message : error);
    return Response.json({ slots: [], error: "일정을 불러오지 못했습니다." }, { status: 503 });
  }
}
