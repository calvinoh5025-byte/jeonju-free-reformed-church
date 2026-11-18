import { serviceRest, signModeration, verifyModeration, type ModerationAction } from "../../../../lib/board-moderation";

type Post = { id: number; author: string; title: string; content: string; status: string };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>
body{margin:0;background:#f4efe6;color:#1d2433;font-family:"Noto Sans KR",system-ui,sans-serif;line-height:1.7}
main{max-width:560px;margin:0 auto;padding:32px 20px}
h1{font-size:1.4rem;margin:0 0 16px}
.card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.08);margin-bottom:20px}
.meta{color:#5b6475;font-size:.95rem;margin-bottom:10px}
.content{white-space:pre-wrap;word-break:break-word}
button,a.btn{display:block;width:100%;box-sizing:border-box;font-size:1.15rem;font-weight:700;padding:16px;border-radius:12px;border:0;margin-bottom:12px;cursor:pointer;text-align:center;text-decoration:none}
.approve{background:#1f5b45;color:#fff}.unapprove{background:#fff;color:#8a5a00;border:2px solid #8a5a00}.delete{background:#fff;color:#a12d2d;border:2px solid #a12d2d}.home{background:#1d2433;color:#fff}
.notice{font-size:1.05rem}
</style></head><body><main>${body}</main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

const failPage = (message: string, status = 400) => page("처리할 수 없습니다", `<h1>처리할 수 없습니다</h1><p class="notice">${escapeHtml(message)}</p><a class="btn home" href="/board">자유게시판으로 가기</a>`, status);

function readParams(params: URLSearchParams) {
  const id = Number(params.get("id"));
  const action = params.get("action") as ModerationAction | null;
  const sig = params.get("sig") ?? "";
  if (!Number.isInteger(id) || id <= 0 || (action !== "approve" && action !== "unapprove" && action !== "delete")) return null;
  if (!verifyModeration(id, action, sig)) return null;
  return { id, action, sig };
}

async function loadPost(id: number) {
  const response = await serviceRest(`frck_board_posts?select=id,author,title,content,status&id=eq.${id}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json() as Post[];
  return rows[0] ?? null;
}

const labels: Record<ModerationAction, { question: string; button: string; done: string }> = {
  approve: { question: "이 글을 게시판에 공개할까요?", button: "공개하기 (승인)", done: "승인되었습니다. 이제 자유게시판에 보입니다." },
  unapprove: { question: "이 글의 공개를 취소할까요?", button: "공개 취소하기 (승인 취소)", done: "승인을 취소했습니다. 이제 게시판에 보이지 않습니다." },
  delete: { question: "이 글을 완전히 삭제할까요?", button: "삭제하기", done: "삭제되었습니다." },
};

function actionLink(id: number, action: ModerationAction) {
  const sig = signModeration(id, action);
  return sig ? `/api/board/moderate?id=${id}&action=${action}&sig=${sig}` : null;
}

// 지금 상태에서 할 수 있는 다른 일들을 큰 버튼으로 보여 줍니다.
function nextButtons(id: number, status: string) {
  const actions: ModerationAction[] = status === "approved" ? ["unapprove", "delete"] : ["approve", "delete"];
  return actions.map(action => {
    const href = actionLink(id, action);
    return href ? `<a class="btn ${action}" href="${href}">${labels[action].button}</a>` : "";
  }).join("");
}

// 메일 앱이 링크를 미리 열어 보아도 바로 처리되지 않도록, 열면 확인 화면만 보여 줍니다.
export async function GET(request: Request) {
  const params = readParams(new URL(request.url).searchParams);
  if (!params) return failPage("링크가 올바르지 않습니다. 알림 메일의 버튼을 다시 눌러 주세요.");
  try {
    const post = await loadPost(params.id);
    if (!post) return failPage("이미 삭제된 글입니다.", 404);
    const current = post.status === "approved" ? "지금 상태: 게시판에 공개됨" : "지금 상태: 공개 대기 중";
    return page("게시글 관리", `<h1>${labels[params.action].question}</h1>
<div class="card"><div class="meta">작성자: ${escapeHtml(post.author)} · ${current}</div><strong>${escapeHtml(post.title)}</strong><p class="content">${escapeHtml(post.content)}</p></div>
<form method="post"><input type="hidden" name="id" value="${post.id}"><input type="hidden" name="action" value="${params.action}"><input type="hidden" name="sig" value="${params.sig}">
<button class="${params.action}" type="submit">${labels[params.action].button}</button></form>
<a class="btn home" href="/board">아무것도 하지 않고 게시판으로 가기</a>`);
  } catch (error) {
    console.error("[board-moderate] load failed", error instanceof Error ? error.message : error);
    return failPage("글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = readParams(new URLSearchParams({ id: String(form.get("id") ?? ""), action: String(form.get("action") ?? ""), sig: String(form.get("sig") ?? "") }));
  if (!params) return failPage("링크가 올바르지 않습니다. 알림 메일의 버튼을 다시 눌러 주세요.");
  try {
    const path = `frck_board_posts?id=eq.${params.id}`;
    const response = params.action === "delete"
      ? await serviceRest(path, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      : await serviceRest(path, { method: "PATCH", headers: { "content-type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(params.action === "approve" ? { status: "approved", approved_at: new Date().toISOString() } : { status: "pending", approved_at: null }) });
    if (!response.ok) throw new Error(await response.text());
    const more = params.action === "delete" ? "" : `<p class="notice">마음이 바뀌시면 아래 버튼을 누르세요.</p>${nextButtons(params.id, params.action === "approve" ? "approved" : "pending")}`;
    return page("처리 완료", `<h1>${labels[params.action].done}</h1>${more}<a class="btn home" href="/board">자유게시판에서 확인하기</a>`);
  } catch (error) {
    console.error("[board-moderate] update failed", error instanceof Error ? error.message : error);
    return failPage("처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
