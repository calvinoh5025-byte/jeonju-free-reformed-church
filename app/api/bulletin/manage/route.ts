import { deleteBulletinObject, listBulletins, verifyBulletinManage } from "../../../../lib/bulletin-storage";

export const dynamic = "force-dynamic";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
function page(body: string, status = 200) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>주보 관리</title><style>body{margin:0;background:#f4efe6;color:#1d2433;font-family:system-ui,sans-serif;line-height:1.7}main{max-width:560px;margin:0 auto;padding:32px 20px}.card{background:#fff;border-radius:12px;padding:20px;margin:20px 0}button,a{display:block;box-sizing:border-box;width:100%;padding:15px;border-radius:9px;margin:10px 0;text-align:center;font:inherit;font-weight:700;text-decoration:none}.delete{border:0;background:#a12d2d;color:white}.home{background:#1d2433;color:#fff}</style></head><body><main>${body}</main></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
function params(url: URL) {
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  return /^[\da-f-]{36}$/i.test(id) && verifyBulletinManage(id, token) ? { id, token } : null;
}
function fail(message: string, status = 400) { return page(`<h1>주보를 관리할 수 없습니다</h1><p>${escapeHtml(message)}</p><a class="home" href="/worship/bulletin">주보 페이지로 돌아가기</a>`, status); }

export async function GET(request: Request) {
  const authorized = params(new URL(request.url));
  if (!authorized) return fail("관리 링크가 올바르지 않습니다.", 403);
  const bulletin = (await listBulletins()).find(item => item.id === authorized.id);
  if (!bulletin) return fail("이미 삭제되었거나 주보를 찾을 수 없습니다.", 404);
  return page(`<h1>${escapeHtml(bulletin.date)} 주보</h1><div class="card"><p>${bulletin.pages.length}쪽 주보를 삭제할까요?</p></div><form method="post"><input type="hidden" name="id" value="${authorized.id}"><input type="hidden" name="token" value="${authorized.token}"><button class="delete" type="submit">주보 삭제하기</button></form><a class="home" href="/worship/bulletin">취소하고 돌아가기</a>`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const url = new URL(request.url);
  url.searchParams.set("id", String(form.get("id") ?? ""));
  url.searchParams.set("token", String(form.get("token") ?? ""));
  const authorized = params(url);
  if (!authorized) return fail("관리 링크가 올바르지 않습니다.", 403);
  const bulletin = (await listBulletins()).find(item => item.id === authorized.id);
  if (!bulletin) return fail("이미 삭제되었거나 주보를 찾을 수 없습니다.", 404);
  const removed = await Promise.all(bulletin.pages.map(item => deleteBulletinObject(item.name)));
  if (removed.some(result => !result)) return fail("일부 파일을 삭제하지 못했습니다. 다시 시도해 주세요.", 502);
  return page(`<h1>주보를 삭제했습니다.</h1><a class="home" href="/worship/bulletin">주보 페이지로 돌아가기</a>`);
}
