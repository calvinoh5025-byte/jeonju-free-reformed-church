"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

type BulletinPage = { name: string; url: string; size: number };
type Bulletin = { id: string; date: string; pages: BulletinPage[] };
const tokenKey = "frck-bulletin-manage-tokens";
const korean = (date: string) => { const [year, month, day] = date.split("-"); return `${year}년 ${Number(month)}월 ${Number(day)}일`; };
const isPdf = (name: string) => name.toLowerCase().endsWith(".pdf");
function comingSunday() {
  const today = new Date(); today.setDate(today.getDate() + (7 - today.getDay()) % 7); return today.toISOString().slice(0, 10);
}

export function BulletinBoard() {
  const [bulletins, setBulletins] = useState<Bulletin[] | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(true);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/bulletin", { cache: "no-store" });
      const data = await response.json(); setBulletins(data.bulletins ?? []); setReady(data.ready !== false);
    } catch { setBulletins([]); setReady(false); }
  }, []);
  useEffect(() => {
    // localStorage is only available in the browser; load saved per-device ownership tokens after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setTokens(JSON.parse(localStorage.getItem(tokenKey) ?? "{}")); } catch { setTokens({}); }
    setDate(comingSunday()); void load();
  }, [load]);

  function rememberToken(id: string, token: string) {
    const next = { ...tokens, [id]: token }; setTokens(next); localStorage.setItem(tokenKey, JSON.stringify(next));
  }
  function forgetToken(id: string) {
    const next = { ...tokens }; delete next[id]; setTokens(next); localStorage.setItem(tokenKey, JSON.stringify(next));
  }
  function validateFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (files.length > 2 || (files.length > 1 && files.some(file => file.type === "application/pdf"))) {
      setFailed(true); setMessage("PDF는 한 파일에 최대 2쪽을 담아 올리고, 사진은 최대 2장까지 선택해 주세요."); event.target.value = "";
    } else { setFailed(false); setMessage(""); }
  }

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const files = [...(fileInput.current?.files ?? [])];
    if (!files.length) { setFailed(true); setMessage("주보 파일을 골라 주세요."); return; }
    if (files.length > 2 || (files.length > 1 && files.some(file => file.type === "application/pdf"))) { setFailed(true); setMessage("PDF는 한 파일에 최대 2쪽을 담아 올리고, 사진은 최대 2장까지 선택해 주세요."); return; }
    setBusy(true); setFailed(false); setMessage("올리는 중입니다…");
    try {
      const body = new FormData(); files.forEach(file => body.append("files", file)); body.append("date", date);
      const response = await fetch("/api/bulletin", { method: "POST", body }); const data = await response.json();
      if (!response.ok) { setFailed(true); setMessage(data.error ?? "올리지 못했습니다."); }
      else {
        if (data.id && data.manageToken) rememberToken(data.id, data.manageToken);
        setMessage("주보를 올렸습니다. 고맙습니다."); setBulletins(data.bulletins ?? []); setOpen(false);
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch { setFailed(true); setMessage("올리지 못했습니다. 연결을 확인해 주세요."); }
    setBusy(false);
  };

  async function remove(item: Bulletin) {
    if (!window.confirm(`${korean(item.date)} 주보를 삭제할까요? 삭제한 파일은 복구할 수 없습니다.`)) return;
    setMessage("삭제 중입니다…");
    try {
      const response = await fetch("/api/bulletin", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, token: tokens[item.id] }) });
      const data = await response.json();
      if (!response.ok) { setFailed(true); setMessage(data.error ?? "삭제하지 못했습니다."); return; }
      forgetToken(item.id); setFailed(false); setMessage("주보를 삭제했습니다."); setBulletins(data.bulletins ?? []);
    } catch { setFailed(true); setMessage("삭제하지 못했습니다. 연결을 확인해 주세요."); }
  }

  const latest = bulletins?.[0] ?? null;
  const renderBulletin = (item: Bulletin, featured = false) => <section className={featured ? "bulletin-latest" : "bulletin-past-item"} key={item.id}>
    <header><h2>{korean(item.date)} 주보</h2><div className="bulletin-buttons">{item.pages.map((page, index) => <a className="button primary" href={page.url} target="_blank" rel="noreferrer" key={page.name}>{item.pages.length > 1 ? `${index + 1}쪽 크게 보기 ↗` : "크게 보기 ↗"}</a>)}{tokens[item.id] && <button type="button" className="button secondary dark" onClick={() => void remove(item)}>주보 삭제</button>}</div></header>
    <div className="bulletin-pages">{item.pages.map((page, index) => isPdf(page.name)
      ? <object key={page.name} data={page.url} type="application/pdf" aria-label={`${korean(item.date)} 주보`}><p className="bulletin-note">여기서는 미리 볼 수 없습니다. 위의 <b>크게 보기</b>를 눌러 주세요.</p></object>
      : <figure key={page.name}>{item.pages.length > 1 && <figcaption>{index + 1}쪽</figcaption>}<img src={page.url} alt={`${korean(item.date)} 주보${item.pages.length > 1 ? ` ${index + 1}쪽` : ""}`} /></figure>)}</div>
  </section>;

  return <div className="bulletin">
    {bulletins === null && <p className="bulletin-note">주보를 불러오는 중입니다…</p>}
    {bulletins !== null && !latest && <p className="bulletin-note">아직 올라온 주보가 없습니다. 아래에서 이번 주 주보를 올려 주세요.</p>}
    {latest && renderBulletin(latest, true)}
    <section className="bulletin-upload" aria-labelledby="bulletin-upload-title">
      <h2 id="bulletin-upload-title">주보 올리기</h2>
      {!ready && <p className="bulletin-note">주보 저장소가 아직 준비되지 않았습니다. 관리자에게 알려 주세요.</p>}
      {ready && !open && <button type="button" className="button primary" onClick={() => { setOpen(true); setMessage(""); }}>이번 주 주보 올리기</button>}
      {ready && open && <form onSubmit={send}>
        <label htmlFor="bulletin-date">주일 날짜</label><input id="bulletin-date" type="date" value={date} onChange={event => setDate(event.target.value)} required />
        <label htmlFor="bulletin-file">주보 파일 (PDF 최대 2쪽 또는 사진 최대 2장, 전체 10MB 이하)</label>
        <input id="bulletin-file" type="file" ref={fileInput} accept="application/pdf,image/jpeg,image/png,image/webp" multiple required onChange={validateFiles} />
        <div className="bulletin-buttons"><button type="submit" className="button primary" disabled={busy}>{busy ? "올리는 중…" : "올리기"}</button><button type="button" className="button secondary dark" onClick={() => { setOpen(false); setMessage(""); }}>취소</button></div>
      </form>}
      {message && <p className={failed ? "bulletin-note bulletin-error" : "bulletin-note"} aria-live="polite">{message}</p>}
      <p className="bulletin-note">올린 주보는 이 기기에서 삭제할 수 있습니다.</p>
    </section>
    {!!bulletins && bulletins.length > 1 && <section className="bulletin-past" aria-labelledby="bulletin-past-title"><h2 id="bulletin-past-title">지난 주보</h2>{bulletins.slice(1).map(item => renderBulletin(item))}</section>}
  </div>;
}
