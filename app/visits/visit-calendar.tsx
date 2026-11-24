"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./visit-calendar.module.css";

type Slot = { id: string; starts_at: string; kind: "elder" | "deacon" };
const sampleSlots: Slot[] = [
  { id: "sample-1", starts_at: "2026-11-26T10:00:00+09:00", kind: "elder" },
  { id: "sample-2", starts_at: "2026-11-29T14:00:00+09:00", kind: "deacon" },
  { id: "sample-3", starts_at: "2026-12-03T11:00:00+09:00", kind: "elder" },
];
const week = ["일", "월", "화", "수", "목", "금", "토"];
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function VisitCalendar() {
  const [month, setMonth] = useState(() => new Date(2026, 10, 1));
  const [full, setFull] = useState(false);
  const slots = sampleSlots;
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
  const entries = (day: number) => slots.filter(s => dateKey(new Date(s.starts_at)) === dateKey(new Date(month.getFullYear(), month.getMonth(), day)));
  const calendar = <>
    <div className={styles.toolbar}><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="이전 달">‹</button><h2>{month.getFullYear()}년 {month.getMonth() + 1}월</h2><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="다음 달">›</button></div>
    <div className={styles.grid} role="grid" aria-label={`${month.getFullYear()}년 ${month.getMonth() + 1}월 심방 일정`}>
      {week.map((d, i) => <div className={`${styles.weekday} ${i === 0 ? styles.sunday : ""}`} key={d}>{d}</div>)}
      {days.map((day, i) => <div className={`${styles.day} ${day ? "" : styles.empty}`} key={`${day ?? "blank"}-${i}`} role="gridcell">{day && <><span className={styles.dayNumber}>{day}</span>{entries(day).map(s => <div className={`${styles.event} ${s.kind === "deacon" ? styles.deacon : styles.elder}`} key={s.id}><strong>{s.kind === "deacon" ? "집사 심방" : "장로 심방"}</strong><time>{new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(s.starts_at))}</time></div>)}</>}</div>)}
    </div>
    <div className={styles.legend} aria-label="심방 종류 범례"><span><i className={styles.elderDot} />장로 심방</span><span><i className={styles.deaconDot} />집사 심방</span></div>
    <p className={styles.note}>※ 현재는 화면 확인을 위한 예시 일정입니다.</p>
  </>;
  return <section className={full ? styles.fullscreen : styles.wrap} aria-label="심방 일정 달력">{full && <div className={styles.fullHeader}><strong>심방 일정</strong><button onClick={close}>닫기 ×</button></div>}{!full && <button className={styles.fullButton} onClick={() => setFull(true)}>전체 화면</button>}{calendar}</section>;
}
