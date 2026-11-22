"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { SHARE_CATEGORIES } from "../../lib/share-categories";

type Item = { id: string; title: string; description: string; category: string; author: string; filename: string; size: number; createdAt: string; url: string };
const tokenKey = "frck-share-manage-tokens";
const MAX_BYTES = 10 * 1024 * 1024;

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};
const sizeText = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`);

export function ShareBoard() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [ready, setReady] = useState(true);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<string>("전체");
  const form = useRef<HTMLFormElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/shared-resources", { cache: "no-store" });
      const data = await response.json();
      setItems(data.items ?? []);
      setReady(data.ready !== false);
    } catch { setItems([]); setReady(false); }
  }, []);

  useEffect(() => {
    // 올린 기기에서만 삭제할 수 있도록, 기기에 저장해 둔 열쇠를 불러옵니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setTokens(JSON.parse(localStorage.getItem(tokenKey) ?? "{}")); } catch { setTokens({}); }
    void load();
  }, [load]);

  function saveTokens(next: Record<string, string>) {
    setTokens(next);
    try { localStorage.setItem(tokenKey, JSON.stringify(next)); } catch {}
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0) { setFailed(true); setMessage("자료 파일을 골라 주세요."); return; }
    if (file.size > MAX_BYTES) { setFailed(true); setMessage("파일은 10MB 이하로 올려 주세요."); return; }
    setBusy(true); setFailed(false); setMessage("올리는 중입니다…");
    try {
      const response = await fetch("/api/shared-resources", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) { setFailed(true); setMessage(data.error ?? "올리지 못했습니다."); }
      else {
        if (data.id && data.manageToken) saveTokens({ ...tokens, [data.id]: data.manageToken });
        setItems(data.items ?? []);
        setMessage("자료를 올렸습니다. 고맙습니다.");
        setOpen(false);
        form.current?.reset();
      }
    } catch { setFailed(true); setMessage("올리지 못했습니다. 연결을 확인해 주세요."); }
    setBusy(false);
  }

  async function remove(item: Item) {
    if (!window.confirm(`"${item.title}" 자료를 삭제할까요? 삭제한 파일은 복구할 수 없습니다.`)) return;
    setFailed(false); setMessage("삭제 중입니다…");
    try {
      const response = await fetch("/api/shared-resources", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, token: tokens[item.id] }) });
      const data = await response.json();
      if (!response.ok) { setFailed(true); setMessage(data.error ?? "삭제하지 못했습니다."); return; }
      const next = { ...tokens }; delete next[item.id]; saveTokens(next);
      setItems(data.items ?? []);
      setMessage("자료를 삭제했습니다.");
    } catch { setFailed(true); setMessage("삭제하지 못했습니다. 연결을 확인해 주세요."); }
  }

  const visible = (items ?? []).filter(item => filter === "전체" || item.category === filter);

  return <div className="share">
    <section className="share-upload" aria-labelledby="share-upload-title">
      <h2 id="share-upload-title">자료 올리기</h2>
      {!ready && <p className="share-note">자료 저장소가 아직 준비되지 않았습니다. 관리자에게 알려 주세요.</p>}
      {ready && !open && <button type="button" className="button primary" onClick={() => { setOpen(true); setMessage(""); }}>자료 올리기</button>}
      {ready && open && <form ref={form} onSubmit={send}>
        <label htmlFor="share-title">제목 (필수)</label>
        <input id="share-title" name="title" type="text" maxLength={60} minLength={2} required placeholder="예: 11월 주일학교 공과 교재" />
        <label htmlFor="share-category">자료 종류 (필수)</label>
        <select id="share-category" name="category" required defaultValue="">
          <option value="" disabled>종류를 골라 주세요</option>
          {SHARE_CATEGORIES.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <label htmlFor="share-desc">설명 (선택)</label>
        <textarea id="share-desc" name="description" maxLength={300} rows={3} placeholder="어떤 자료인지 짧게 적어 주세요." />
        <label htmlFor="share-author">올리는 사람 (선택)</label>
        <input id="share-author" name="author" type="text" maxLength={20} placeholder="이름 또는 별명" />
        <label htmlFor="share-file">파일 (PDF·사진·워드·한글·txt, 10MB 이하)</label>
        <input id="share-file" name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.hwp,.hwpx,.txt" />
        <div className="share-buttons">
          <button type="submit" className="button primary" disabled={busy}>{busy ? "올리는 중…" : "올리기"}</button>
          <button type="button" className="button secondary dark" onClick={() => { setOpen(false); setMessage(""); }}>취소</button>
        </div>
      </form>}
      {message && <p className={failed ? "share-note share-error" : "share-note"} aria-live="polite">{message}</p>}
      <p className="share-note">누구나 올릴 수 있습니다. 올린 자료는 올린 기기에서만 삭제할 수 있고, 관리자에게도 알림이 갑니다. 저작권이 있는 자료는 올리기 전에 허락을 받아 주세요.</p>
    </section>

    <section className="share-list" aria-labelledby="share-list-title">
      <h2 id="share-list-title">올라온 자료</h2>
      {items === null && <p className="share-note">자료를 불러오는 중입니다…</p>}
      {items !== null && items.length === 0 && <p className="share-note">아직 올라온 자료가 없습니다. 첫 자료를 올려 주세요.</p>}
      {items !== null && items.length > 0 && <div className="share-buttons" role="group" aria-label="자료 종류별 보기">
        {["전체", ...SHARE_CATEGORIES].map(name => {
          const count = name === "전체" ? items.length : items.filter(entry => entry.category === name).length;
          return <button type="button" key={name} className={filter === name ? "button primary" : "button secondary dark"} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name} ({count})</button>;
        })}
      </div>}
      {items !== null && items.length > 0 && visible.length === 0 && <p className="share-note">이 종류로 올라온 자료가 아직 없습니다.</p>}
      <ul>
        {visible.map(item => <li key={item.id}>
          <div>
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            <small>{[item.category, item.author || "이름 없음", when(item.createdAt), `${item.filename} · ${sizeText(item.size)}`].filter(Boolean).join(" · ")}</small>
          </div>
          <div className="share-item-buttons">
            <a className="button primary" href={item.url} target="_blank" rel="noreferrer" download>내려받기</a>
            {tokens[item.id] && <button type="button" className="button secondary dark" onClick={() => void remove(item)}>삭제</button>}
          </div>
        </li>)}
      </ul>
    </section>
  </div>;
}
