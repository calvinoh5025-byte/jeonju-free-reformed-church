"use client";

import { FormEvent, useEffect, useState } from "react";

type Post = { id: number; author: string; title: string; content: string; createdAt: string };
type PostFields = Pick<Post, "author" | "title" | "content">;
const tokenKey = "frck-free-board-manage-tokens";

export default function FreeBoardClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<PostFields>({ author: "", title: "", content: "" });
  const [loading, setLoading] = useState(true);

  const load = () => fetch("/api/free-board", { cache: "no-store" })
    .then(async response => {
      if (!response.ok) throw new Error("목록을 불러오지 못했습니다.");
      return response.json();
    })
    .then(data => setPosts(data.posts ?? []))
    .catch(() => setMessage("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."))
    .finally(() => setLoading(false));

  useEffect(() => {
    // localStorage is only available in the browser; load saved per-device ownership tokens after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setTokens(JSON.parse(localStorage.getItem(tokenKey) ?? "{}")); } catch { setTokens({}); }
    void load();
  }, []);

  function rememberToken(id: number, token: string) {
    const next = { ...tokens, [id]: token };
    setTokens(next);
    localStorage.setItem(tokenKey, JSON.stringify(next));
  }
  function forgetToken(id: number) {
    const next = { ...tokens };
    delete next[id];
    setTokens(next);
    localStorage.setItem(tokenKey, JSON.stringify(next));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("등록 중입니다...");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/free-board", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "등록하지 못했습니다."); return; }
      if (result.post?.id && result.manageToken) rememberToken(result.post.id, result.manageToken);
      form.reset(); setOpen(false);
      setMessage("등록되었습니다. 이 기기에서 글 수정과 삭제를 할 수 있습니다.");
      await load();
    } catch { setMessage("등록하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
  }

  async function saveEdit(id: number) {
    setMessage("수정 중입니다...");
    try {
      const response = await fetch("/api/free-board", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, token: tokens[id], ...editFields }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "수정하지 못했습니다."); return; }
      setEditing(null); setMessage("글을 수정했습니다."); await load();
    } catch { setMessage("수정하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
  }

  async function deletePost(id: number) {
    if (!window.confirm("이 게시글을 삭제할까요? 삭제한 글은 복구할 수 없습니다.")) return;
    setMessage("삭제 중입니다...");
    try {
      const response = await fetch("/api/free-board", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, token: tokens[id] }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "삭제하지 못했습니다."); return; }
      forgetToken(id); setEditing(null); setMessage("글을 삭제했습니다."); await load();
    } catch { setMessage("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
  }

  return <div className="board-wrap">
    <div className="board-toolbar"><p>작성한 글은 등록 즉시 공개됩니다.</p><button type="button" className="button primary" onClick={() => setOpen(value => !value)}>{open ? "작성 닫기" : "글쓰기"}</button></div>
    {open && <form className="board-form" aria-describedby="free-board-notice" onSubmit={submit}>
      <p id="free-board-notice" role="note" className="form-notice">글은 등록 즉시 누구나 볼 수 있습니다. 전화번호·주소 같은 개인정보는 적지 마세요.</p>
      <div className="form-row"><label>이름<input name="author" maxLength={30} required /></label><label>제목<input name="title" maxLength={100} required /></label></div>
      <label>내용<textarea name="content" maxLength={3000} rows={7} required /></label>
      <label className="honey">웹사이트<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="form-bottom"><p role="status">{message}</p><button className="button primary" type="submit">바로 게시하기</button></div>
    </form>}
    <div className="post-list" aria-live="polite">
      {loading ? <div className="empty-state"><p>게시글을 불러오는 중입니다...</p></div> : posts.length ? posts.map(post => {
        const expanded = openPostId === post.id;
        const mine = !!tokens[post.id];
        return <article key={post.id}>
          <div className="post-meta"><span>{post.author}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</time></div>
          <h3><button className="post-title-button" type="button" aria-expanded={expanded} aria-controls={`free-post-${post.id}`} onClick={() => setOpenPostId(expanded ? null : post.id)}><span>{post.title}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button></h3>
          {expanded && <div className="post-detail" id={`free-post-${post.id}`}>
            {editing === post.id ? <div className="board-form"><label>이름<input maxLength={30} value={editFields.author} onChange={event => setEditFields({ ...editFields, author: event.target.value })} /></label><label>제목<input maxLength={100} value={editFields.title} onChange={event => setEditFields({ ...editFields, title: event.target.value })} /></label><label>내용<textarea rows={7} maxLength={3000} value={editFields.content} onChange={event => setEditFields({ ...editFields, content: event.target.value })} /></label><div className="bulletin-buttons"><button className="button primary" type="button" onClick={() => void saveEdit(post.id)}>수정 저장</button><button className="button secondary dark" type="button" onClick={() => setEditing(null)}>취소</button></div></div> : <p>{post.content}</p>}
            {mine && editing !== post.id && <div className="bulletin-buttons"><button className="button secondary dark" type="button" onClick={() => { setEditFields({ author: post.author, title: post.title, content: post.content }); setEditing(post.id); }}>수정</button><button className="button secondary dark" type="button" onClick={() => void deletePost(post.id)}>삭제</button></div>}
          </div>}
        </article>;
      }) : <div className="empty-state"><img className="empty-state-illustration" src="/illustrations/morning-light.svg" alt="" aria-hidden="true" /><strong>아직 게시글이 없습니다.</strong><p>첫 번째 이야기를 남겨주세요.</p></div>}
    </div>
    {!open && message && <p className="board-status" role="status">{message}</p>}
  </div>;
}
