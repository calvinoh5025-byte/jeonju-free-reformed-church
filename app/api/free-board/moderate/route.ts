import { freeBoardServiceRest, verifyFreeBoardDelete } from "../../../../lib/free-board-moderation";

type Post = { id: number; author: string; title: string; content: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f4efe6;color:#1d2433;font-family:system-ui,sans-serif;line-height:1.7}main{max-width:560px;margin:0 auto;padding:32px 20px}h1{font-size:1.4rem}.card{background:#fff;border-radius:12px;padding:20px;margin:20px 0;box-shadow:0 2px 10px #0001}.content{white-space:pre-wrap;word-break:break-word}button,a{display:block;box-sizing:border-box;width:100%;padding:15px;border-radius:9px;margin:10px 0;text-align:center;font:inherit;font-weight:700;text-decoration:none}.delete{border:2px solid #a12d2d;background:#a12d2d;color:white}.home{background:#1d2433;color:#fff}</style></head><body><main>${body}</main></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function fail(message: string, status = 400) { return page("자유게시판 글 관리", `<h1>처리할 수 없습니다</h1><p>${escapeHtml(message)}</p><a class="home" href="/free-board">자유게시판으로 돌아가기</a>`, status); }

function validParams(params: URLSearchParams) {
  const id = Number(params.get("id"));
  const signature = params.get("sig") ?? "";
  if (!Number.isInteger(id) || id <= 0 || !verifyFreeBoardDelete(id, signature)) return null;
  return { id, signature };
}

async function loadPost(id: number) {
  const response = await freeBoardServiceRest(`frck_free_posts?select=id,author,title,content&id=eq.${id}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json() as Post[];
  return rows[0] ?? null;
}

export async function GET(request: Request) {
  const params = validParams(new URL(request.url).searchParams);
  if (!params) return fail("링크가 올바르지 않습니다. 알림 메일의 삭제 링크를 다시 확인해 주세요.");
  try {
    const post = await loadPost(params.id);
    if (!post) return fail("이미 삭제된 글입니다.", 404);
    return page("자유게시판 글 삭제 확인", `<h1>이 글을 자유게시판에서 삭제할까요?</h1><div class="card"><p>작성자: ${escapeHtml(post.author)}</p><strong>${escapeHtml(post.title)}</strong><p class="content">${escapeHtml(post.content)}</p></div><form method="post"><input type="hidden" name="id" value="${post.id}"><input type="hidden" name="sig" value="${params.signature}"><button class="delete" type="submit">글 삭제하기</button></form><a class="home" href="/free-board">삭제하지 않고 돌아가기</a>`);
  } catch (error) {
    console.error("[free-board-moderate] lookup failed", error instanceof Error ? error.message : error);
    return fail("글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = validParams(new URLSearchParams({ id: String(form.get("id") ?? ""), sig: String(form.get("sig") ?? "") }));
  if (!params) return fail("링크가 올바르지 않습니다. 알림 메일의 삭제 링크를 다시 확인해 주세요.");
  try {
    const response = await freeBoardServiceRest(`frck_free_posts?id=eq.${params.id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    if (!response.ok) throw new Error(await response.text());
    const deleted = await response.json() as Post[];
    if (!deleted.length) return fail("이미 삭제된 글입니다.", 404);
    return page("삭제 완료", `<h1>글을 삭제했습니다.</h1><a class="home" href="/free-board">자유게시판으로 돌아가기</a>`);
  } catch (error) {
    console.error("[free-board-moderate] delete failed", error instanceof Error ? error.message : error);
    return fail("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
}
