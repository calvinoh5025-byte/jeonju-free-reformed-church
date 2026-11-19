"use client";
import { FormEvent, useEffect, useState } from "react";
type Post = { id: number; author: string; title: string; content: string; createdAt: string };

export default function BoardClient() {
  const [posts, setPosts] = useState<Post[]>([]); const [message, setMessage] = useState(""); const [open, setOpen] = useState(false); const [openPostId, setOpenPostId] = useState<number | null>(null);
  const load = () => fetch("/api/board").then(r => r.json()).then(d => setPosts(d.posts ?? [])).catch(() => setPosts([]));
  useEffect(() => { load(); }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage("등록 중입니다..."); const form = new FormData(e.currentTarget);
    const res = await fetch("/api/board", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await res.json(); if (!res.ok) { setMessage(data.error ?? "등록하지 못했습니다."); return; }
    e.currentTarget.reset(); setMessage("접수되었습니다. 관리자가 메일에서 승인하면 공개됩니다.");
  }
  return <div className="board-wrap"><div className="board-toolbar"><p>공지사항</p><button type="button" className="button primary" onClick={() => setOpen(!open)}>{open ? "작성 닫기" : "공지 작성 (관리자)"}</button></div>
    {open && <form className="board-form" aria-describedby="board-notice" onSubmit={submit}><p id="board-notice" role="note" className="form-notice">공지는 관리자가 메일에서 승인한 뒤 공개됩니다. 일반 글은 자유게시판을 이용해 주세요. 전화번호·주소 같은 개인정보는 쓰지 마세요. 새 글 알림을 위해 내용이 메일 전송 서비스를 거쳐 관리자에게 전달됩니다.</p><div className="form-row"><label>이름<input name="author" maxLength={30} required /></label><label>제목<input name="title" maxLength={100} required /></label></div><label>내용<textarea name="content" maxLength={3000} rows={7} required /></label><label className="honey">웹사이트<input name="website" tabIndex={-1} autoComplete="off" /></label><div className="form-bottom"><p>{message}</p><button className="button primary" type="submit">공지 승인 요청</button></div></form>}
    <div className="post-list">{posts.length ? posts.map(p => {
      const isOpen = openPostId === p.id;
      return <article key={p.id}><div className="post-meta"><span>{p.author}</span><time>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</time></div><h3><button className="post-title-button" type="button" aria-expanded={isOpen} aria-controls={`post-${p.id}`} onClick={() => setOpenPostId(isOpen ? null : p.id)}><span>{p.title}</span><span aria-hidden="true">{isOpen ? "−" : "+"}</span></button></h3>{isOpen && <div className="post-detail" id={`post-${p.id}`}><p>{p.content}</p></div>}</article>;
    }) : <div className="empty-state"><img className="empty-state-illustration" src="/illustrations/morning-light.svg" alt="" aria-hidden="true" /><strong>등록된 공지사항이 없습니다.</strong></div>}</div></div>;
}
