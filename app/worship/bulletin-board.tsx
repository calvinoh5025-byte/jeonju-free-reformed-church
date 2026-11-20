"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Bulletin = { name: string; date: string; url: string; size: number };

const korean = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

const isPdf = (name: string) => name.toLowerCase().endsWith(".pdf");

function comingSunday() {
  const today = new Date();
  const ahead = (7 - today.getDay()) % 7;
  today.setDate(today.getDate() + ahead);
  return today.toISOString().slice(0, 10);
}

export function BulletinBoard() {
  const [bulletins, setBulletins] = useState<Bulletin[] | null>(null);
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
      const data = await response.json();
      setBulletins(data.bulletins ?? []);
      setReady(data.ready !== false);
    } catch {
      setBulletins([]);
      setReady(false);
    }
  }, []);

  useEffect(() => { setDate(comingSunday()); load(); }, [load]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) { setFailed(true); setMessage("주보 파일을 골라 주세요."); return; }
    setBusy(true);
    setFailed(false);
    setMessage("올리는 중입니다…");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("date", date);
      const response = await fetch("/api/bulletin", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) { setFailed(true); setMessage(data.error ?? "올리지 못했습니다."); }
      else {
        setMessage("주보를 올렸습니다. 고맙습니다.");
        setBulletins(data.bulletins ?? []);
        setOpen(false);
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch {
      setFailed(true);
      setMessage("올리지 못했습니다. 연결을 확인해 주세요.");
    }
    setBusy(false);
  };

  const latest = bulletins && bulletins.length > 0 ? bulletins[0] : null;
  const older = bulletins ? bulletins.slice(1) : [];

  return <div className="bulletin">
    {bulletins === null && <p className="bulletin-note">주보를 불러오는 중입니다…</p>}

    {bulletins !== null && !latest && <p className="bulletin-note">아직 올라온 주보가 없습니다. 아래에서 이번 주 주보를 올려 주세요.</p>}

    {latest && <section className="bulletin-latest" aria-label="이번 주 주보">
      <header><h2>{korean(latest.date)} 주보</h2><a className="button primary" href={latest.url} target="_blank" rel="noreferrer">크게 보기 ↗</a></header>
      {isPdf(latest.name)
        ? <object data={latest.url} type="application/pdf" aria-label={`${korean(latest.date)} 주보`}><p className="bulletin-note">여기서는 미리 볼 수 없습니다. 위의 <b>크게 보기</b>를 눌러 주세요.</p></object>
        : <img src={latest.url} alt={`${korean(latest.date)} 주보`} />}
    </section>}

    <section className="bulletin-upload" aria-labelledby="bulletin-upload-title">
      <h2 id="bulletin-upload-title">주보 올리기</h2>
      {!ready && <p className="bulletin-note">주보 저장소가 아직 준비되지 않았습니다. 관리자에게 알려 주세요.</p>}
      {ready && !open && <button type="button" className="button primary" onClick={() => { setOpen(true); setMessage(""); }}>이번 주 주보 올리기</button>}
      {ready && open && <form onSubmit={send}>
        <label htmlFor="bulletin-date">주일 날짜</label>
        <input id="bulletin-date" type="date" value={date} onChange={event => setDate(event.target.value)} required />
        <label htmlFor="bulletin-file">주보 파일 (PDF 또는 사진, 10MB 이하)</label>
        <input id="bulletin-file" type="file" ref={fileInput} accept="application/pdf,image/jpeg,image/png,image/webp" required />
        <div className="bulletin-buttons">
          <button type="submit" className="button primary" disabled={busy}>{busy ? "올리는 중…" : "올리기"}</button>
          <button type="button" className="button secondary dark" onClick={() => { setOpen(false); setMessage(""); }}>취소</button>
        </div>
      </form>}
      {message && <p className={failed ? "bulletin-note bulletin-error" : "bulletin-note"} aria-live="polite">{message}</p>}
      <p className="bulletin-note">누구나 올릴 수 있습니다. 올린 주보는 바로 이 페이지에 보입니다.</p>
    </section>

    {older.length > 0 && <section className="bulletin-past" aria-labelledby="bulletin-past-title">
      <h2 id="bulletin-past-title">지난 주보</h2>
      <ul>
        {older.map(item => <li key={item.name}><a href={item.url} target="_blank" rel="noreferrer">{korean(item.date)} 주보 <span aria-hidden="true">↗</span></a></li>)}
      </ul>
    </section>}
  </div>;
}
