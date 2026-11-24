import { freeBoardServiceRest } from "../../../../lib/free-board-moderation";

// 공개 API: '내 심방 알림'에서 고를 이름 목록. 가장 최근 시기(성찬 심방)에 들어 있는 심방 대상자의 번호와 이름만 돌려줍니다.
// 메모·분류·교우명단 정보는 내보내지 않습니다.
export async function GET() {
  try {
    const round = await freeBoardServiceRest("frck_visit_rounds?select=id&order=event_date.desc.nullslast,id.desc&limit=1", { headers: { Accept: "application/json" } });
    if (!round.ok) throw new Error(`round status ${round.status}`);
    const roundId = ((await round.json()) as Array<{ id: number }>)[0]?.id;
    if (!roundId) return Response.json({ families: [] }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
    const members = await freeBoardServiceRest(`frck_visit_round_members?select=target_id&round_id=eq.${roundId}&limit=1000`, { headers: { Accept: "application/json" } });
    if (!members.ok) throw new Error(`members status ${members.status}`);
    const ids = ((await members.json()) as Array<{ target_id: number }>).map(r => r.target_id);
    if (!ids.length) return Response.json({ families: [] }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
    const targets = await freeBoardServiceRest(`frck_visit_targets?select=id,name&active=eq.true&id=in.(${ids.join(",")})&order=name.asc&limit=1000`, { headers: { Accept: "application/json" } });
    if (!targets.ok) throw new Error(`targets status ${targets.status}`);
    const families = ((await targets.json()) as Array<{ id: number; name: string }>).map(t => ({ id: t.id, name: t.name }));
    return Response.json({ families }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("[visit-push] families failed", error instanceof Error ? error.message : error);
    return Response.json({ families: [], error: "목록을 불러오지 못했습니다." }, { status: 503 });
  }
}
