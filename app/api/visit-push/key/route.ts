import { getVapid } from "../../../../lib/visit-push";

// 공개 키(브라우저가 알림을 신청할 때 필요). 비밀 키는 절대 내보내지 않습니다.
export async function GET() {
  try {
    const { publicKey } = await getVapid();
    return Response.json({ publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    console.error("[visit-push] key failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "알림 설정을 불러오지 못했습니다." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
