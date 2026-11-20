import { deleteObject, listShared, verifyShareManage } from "../../../../lib/shared-resources";

export const dynamic = "force-dynamic";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

function page(body: string, status = 200) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>자료 관리</title><style>body{margin:0;background:#f6f0e4;color:#263530;font-family:"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif;line-height:1.7}main{max-width:520px;margin:0 auto;padding:40px 22px}h1{font-size:24px}.card{background:#fffcf5;border:1px solid #e5dccb;border-radius:14px;padding:18px 20px;margin:18px 0}button,.home{display:block;width:100%;text-align:center;box-sizing:border-box;font:inherit;font-weight:700;padding:15px;border-radius:12px;border:0;cursor:pointer;text-decoration:none;margin-top:12px}button{background:#a12d2d;color:#fff}.home{background:#fff;color:#29463f;border:2px solid #29463f}</style></head><body><main>${body}</main></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

const fail = (message: string, status = 400) => page(`<h1>자료를 관리할 수 없습니다</h1><p>${escapeHtml(message)}</p><a class="home" href="/resources/share">자료 나눔으로 돌아가기</a>`, status);

function check(id: string, token: string) {
  return /^[\da-f-]{36}$/i.test(id) && verifyShareManage(id, token);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!check(id, token)) return fail("관리 링크가 올바르지 않습니다.", 403);
  const item = (await listShared()).find(entry => entry.id === id);
  if (!item) return fail("이미 삭제되었거나 자료를 찾을 수 없습니다.", 404);
  return page(`<h1>이 자료를 삭제할까요?</h1><div class="card"><b>${escapeHtml(item.title)}</b><br>올린 사람: ${escapeHtml(item.author || "이름 없음")}<br>${escapeHtml(item.filename)}</div><form method="post"><input type="hidden" name="id" value="${id}"><input type="hidden" name="token" value="${token}"><button type="submit">삭제하기</button></form><a class="home" href="/resources/share">취소</a>`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const token = String(form.get("token") ?? "");
  if (!check(id, token)) return fail("관리 링크가 올바르지 않습니다.", 403);
  const item = (await listShared()).find(entry => entry.id === id);
  if (!item) return fail("이미 삭제되었거나 자료를 찾을 수 없습니다.", 404);
  const removed = await Promise.all([deleteObject(item.fileKey), deleteObject(item.metaKey)]);
  if (removed.some(ok => !ok)) return fail("일부 파일을 삭제하지 못했습니다. 다시 시도해 주세요.", 502);
  return page(`<h1>자료를 삭제했습니다.</h1><a class="home" href="/resources/share">자료 나눔으로 돌아가기</a>`);
}
