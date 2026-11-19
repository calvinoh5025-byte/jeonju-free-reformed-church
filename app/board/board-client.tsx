"use client";
import { useEffect, useState } from "react";
type Post = { id: number; author: string; title: string; content: string; createdAt: string };

export default function BoardClient() {
  const [posts, setPosts] = useState<Post[]>([]); const [openPostId, setOpenPostId] = useState<number | null>(null);
  const load = () => fetch("/api/board").then(r => r.json()).then(d => setPosts(d.posts ?? [])).catch(() => setPosts([]));
  useEffect(() => { load(); }, []);
  return <div className="board-wrap"><div className="board-toolbar"><p>공지사항</p></div>
    <div className="post-list">{posts.length ? posts.map(p => {
      const isOpen = openPostId === p.id;
      return <article key={p.id}><div className="post-meta"><span>{p.author}</span><time>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</time></div><h3><button className="post-title-button" type="button" aria-expanded={isOpen} aria-controls={`post-${p.id}`} onClick={() => setOpenPostId(isOpen ? null : p.id)}><span>{p.title}</span><span aria-hidden="true">{isOpen ? "−" : "+"}</span></button></h3>{isOpen && <div className="post-detail" id={`post-${p.id}`}><p>{p.content}</p></div>}</article>;
    }) : <div className="empty-state"><img className="empty-state-illustration" src="/illustrations/morning-light.svg" alt="" aria-hidden="true" /><strong>등록된 공지사항이 없습니다.</strong></div>}</div></div>;
}
