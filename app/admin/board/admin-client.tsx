"use client";
import { useEffect, useState } from "react";
type Post = { id: number; author: string; title: string; content: string; status: string; createdAt: string };
export default function AdminClient() {
  const [posts,setPosts]=useState<Post[]>([]); const [error,setError]=useState("");
  const load=()=>fetch("/api/admin/board").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setPosts(d.posts)}).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  async function act(id:number,action:string){await fetch("/api/admin/board",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,action})});load()}
  if(error)return <div className="admin-auth"><p>{error}</p><a className="button primary" href="/signin-with-chatgpt?return_to=%2Fadmin%2Fboard">관리자로 로그인</a></div>;
  return <div className="admin-posts">{posts.map(p=><article key={p.id}><div><span className={`status ${p.status}`}>{p.status}</span><small>{p.author} · {new Date(p.createdAt).toLocaleDateString("ko-KR")}</small></div><h3>{p.title}</h3><p>{p.content}</p><div>{p.status!=="approved"&&<button onClick={()=>act(p.id,"approve")}>승인</button>}<button onClick={()=>act(p.id,"reject")}>숨김</button><button className="danger" onClick={()=>act(p.id,"delete")}>삭제</button></div></article>)}</div>;
}
