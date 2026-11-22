"use client";

import { useEffect, useState } from "react";
type Stanza = { n: number; lines: string[]; section?: string };
type Item = { n: number; title: string; subtitle: string[]; tune: string[]; scorePage: number; stanzas: Stanza[]; audio?: string };
const AUDIO_BASE = "https://eipsircytjjzypolrtie.supabase.co/storage/v1/object/public/audio";
const ALT_HYMNS = [52, 60, 66];
export function WorshipReader({ item, kind, maximum }: { item: Item; kind: "psalms" | "hymns"; maximum: number }) {
  const [fontSize, setFontSize] = useState(20);
  const label = kind === "psalms" ? "시편" : "찬송";
  const [audioOpen, setAudioOpen] = useState(false);
  const [useAlt, setUseAlt] = useState(false);
  const [audioMissing, setAudioMissing] = useState(false);
  const file = String(item.n).padStart(3, "0");
  const hasAlt = kind === "hymns" && ALT_HYMNS.includes(item.n);
  const audioSrc = `${AUDIO_BASE}/${kind}/${file}${useAlt ? "-alt" : ""}.m4a`;
  useEffect(() => { try { const saved = Number(localStorage.getItem("worship-font-size")); if (saved >= 16 && saved <= 32) setFontSize(saved); } catch {} }, []);
  const changeSize = (delta: number) => setFontSize(current => { const next = Math.max(16, Math.min(32, current + delta)); try { localStorage.setItem("worship-font-size", String(next)); } catch {} return next; });
  return <>
    <div className="worship-reader-tools"><button type="button" onClick={() => changeSize(-2)}>가−</button><button type="button" onClick={() => changeSize(2)}>가+</button><button type="button" className="worship-audio-button" aria-expanded={audioOpen} onClick={() => { setAudioOpen(!audioOpen); setAudioMissing(false); }}>{audioOpen ? "음원 닫기" : "♪ 음원 듣기"}</button></div>
    <header className="worship-reader-title"><div><h2>{label} {item.n}{kind === "psalms" ? "편" : "장"}{kind === "hymns" && item.title ? ` ${item.title}` : ""}</h2>{(() => { const parts = [kind === "psalms" ? item.title : "", ...item.subtitle].filter(Boolean); return parts.length ? <p>{parts.join(" · ")}</p> : null; })()}</div>{item.tune.length > 0 && <small>{item.tune.join(" · ")}</small>}</header>
    {audioOpen && <div className="worship-audio">
      {audioMissing
        ? <p>이 곡의 음원은 아직 준비 중입니다.</p>
        : <audio key={audioSrc} controls controlsList="nodownload" onContextMenu={event => event.preventDefault()} autoPlay preload="none" src={audioSrc} onError={() => setAudioMissing(true)}>오디오 재생을 지원하지 않는 브라우저입니다.</audio>}
      {hasAlt && !audioMissing && <button type="button" onClick={() => setUseAlt(!useAlt)}>{useAlt ? "기본 버전 듣기" : "다른 버전 듣기"}</button>}
      <small>1절 음원입니다.</small>
    </div>}
    <div className="worship-stanzas" style={{ fontSize }}>
      {item.stanzas.map(stanza => <section className="worship-stanza" key={stanza.n}>{stanza.section && <h3>{stanza.section}</h3>}<h4>{stanza.n}.</h4><div>{stanza.lines.map((line, index) => <p key={`${stanza.n}-${index}`}>{line}</p>)}</div></section>)}
    </div>
    <nav className="worship-reader-nav" aria-label="곡 이동"><a href={item.n > 1 ? `/worship/${kind}/${item.n - 1}` : `/worship/${kind}`}>← 이전 {label}</a><a href={`/worship/${kind}`}>목록으로</a><a href={item.n < maximum ? `/worship/${kind}/${item.n + 1}` : `/worship/${kind}`}>다음 {label} →</a></nav>
  </>;
}
