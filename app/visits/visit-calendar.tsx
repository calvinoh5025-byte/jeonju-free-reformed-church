"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./visit-calendar.module.css";

type Slot = { id: string; starts_at: string; kind: "elder" | "deacon" | "special"; pastor: boolean; done: boolean };
const kindLabel = { elder: "장로 심방", deacon: "집사 심방", special: "특별 심방" } as const;
const week = ["일", "월", "화", "수", "목", "금", "토"];
const kstDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const kstTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
const slotKey = (iso: string) => kstDate.format(new Date(iso));
const dayKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function VisitCalendar() {
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [full, setFull] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetch("/api/visit-slots")
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json() as Promise<{ slots: Slot[] }>; })
      .then(data => { if (alive) { setSlots(data.slots); setState("ready"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  }, [month]);
  const close = useCallback(() => setFull(false), []);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onPop = () => close();
    history.pushState({ visitsFullscreen: true }, "", location.href);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("popstate", onPop); document.body.style.overflow = ""; };
  }, [full, close]);

  const entries = (day: number) => slots.filter(s => slotKey(s.starts_at) === dayKey(month.getFullYear(), month.getMonth(), day));
  const monthHasSlots = slots.some(s => slotKey(s.starts_at).startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`));
  const calendar = <>
    <div className={styles.toolbar}><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="이전 달">‹</button><h2>{month.getFullYear()}년 {month.getMonth() + 1}월</h2><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="다음 달">›</button></div>
    <div className={styles.grid} role="grid" aria-label={`${month.getFullYear()}년 ${month.getMonth() + 1}월 심방 일정`}>
      {week.map((d, i) => <div className={`${styles.weekday} ${i === 0 ? styles.sunday : ""}`} key={d}>{d}</div>)}
      {days.map((day, i) => <div className={`${styles.day} ${day ? "" : styles.empty}`} key={`${day ?? "blank"}-${i}`} role="gridcell">{day && <><span className={styles.dayNumber}>{day}</span>{entries(day).map(s => <div className={`${styles.event} ${s.kind === "deacon" ? styles.deacon : s.kind === "special" ? styles.special : styles.elder} ${s.done ? styles.done : ""}`} key={s.id}><strong>{kindLabel[s.kind]}</strong><time>{kstTime.format(new Date(s.starts_at))}</time>{s.pastor && <span className={styles.pastor}>목사 동행</span>}</div>)}</>}</div>)}
    </div>
    <div className={styles.legend} aria-label="심방 종류 범례"><span><i className={styles.elderDot} />장로 심방</span><span><i className={styles.deaconDot} />집사 심방</span><span><i className={styles.specialDot} />특별 심방</span></div>
    {state === "loading" && <p className={styles.note}>일정을 불러오는 중입니다…</p>}
    {state === "error" && <p className={styles.note}>일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
    {state === "ready" && !monthHasSlots && <p className={styles.note}>이 달에 등록된 심방 일정이 없습니다.</p>}
  </>;
  return <section className={full ? styles.fullscreen : styles.wrap} aria-label="심방 일정 달력">{full && <div className={styles.fullHeader}><strong>심방 일정</strong><button onClick={close}>닫기 ×</button></div>}{!full && <button className={styles.fullButton} onClick={() => setFull(true)}>전체 화면</button>}{calendar}</section>;
}

