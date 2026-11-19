"use client";

import { FormEvent, useEffect, useState } from "react";

type Post = { id: number; author: string; title: string; content: string; createdAt: string };

export default function FreeBoardClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => fetch("/api/free-board", { cache: "no-store" })
    .then(async response => {
      if (!response.ok) throw new Error("목록을 불러오지 못했습니다.");
      return response.json();
    })
    .then(data => setPosts(data.posts ?? []))
    .catch(() => setMessage("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."))
    .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("등록 중입니다...");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/free-board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "등록하지 못했습니다."); return; }
      form.reset();
      setOpen(false);
      setMessage("등록되었습니다. 글이 자유게시판에 바로 공개됩니다.");
      await load();
    } catch {
      setMessage("등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
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
        return <article key={post.id}>
          <div className="post-meta"><span>{post.author}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</time></div>
          <h3><button className="post-title-button" type="button" aria-expanded={expanded} aria-controls={`free-post-${post.id}`} onClick={() => setOpenPostId(expanded ? null : post.id)}><span>{post.title}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button></h3>
          {expanded && <div className="post-detail" id={`free-post-${post.id}`}><p>{post.content}</p></div>}
        </article>;
      }) : <div className="empty-state"><img className="empty-state-illustration" src="/illustrations/morning-light.svg" alt="" aria-hidden="true" /><strong>아직 게시글이 없습니다.</strong><p>첫 번째 이야기를 남겨주세요.</p></div>}
    </div>
    {!open && message && <p className="board-status" role="status">{message}</p>}
  </div>;
}
