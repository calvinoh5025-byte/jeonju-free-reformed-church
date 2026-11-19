"use client";

import { useEffect, useState } from "react";
import data from "../data/universal-creeds.json";

type Item = { n: number; part?: string | null; lines?: string[]; text?: string };
type Creed = { id: string; title: string; intro: string; kind: string; items?: Item[]; lines?: string[] };
const creeds = data.creeds as Creed[];

export function UniversalCreedsReader() {
  const [selectedId, setSelectedId] = useState(creeds[0].id);
  useEffect(() => {
    const fromHash = location.hash.replace("#", "");
    if (creeds.some(c => c.id === fromHash)) setSelectedId(fromHash);
  }, []);
  const select = (id: string) => { setSelectedId(id); history.replaceState(null, "", `#${id}`); };
  const creed = creeds.find(c => c.id === selectedId) ?? creeds[0];

  return <div className="universal-creed-reader">
    <p className="confession-intro">{data.intro}</p>
    <nav className="universal-creed-choices" aria-label="보편 신경 선택">
      {creeds.map(c => <button key={c.id} type="button" className="universal-creed-choice" aria-pressed={c.id === creed.id} onClick={() => select(c.id)}>{c.title}</button>)}
    </nav>
    <article className="universal-creed-text confession-reading" aria-live="polite">
      <h2>{creed.title}</h2>
      <p className="universal-creed-intro">{creed.intro}</p>
      {creed.kind === "articles" && <ol className="creed-articles">{creed.items!.map(item => <li key={item.n}><span className="creed-part">{item.part ? `${item.part}.` : ""}</span><span className="creed-num">{item.n}.</span><span className="creed-lines">{item.lines!.map((line, i) => <span key={i}>{line}<br /></span>)}</span></li>)}</ol>}
      {creed.kind === "lines" && <div className="creed-lines-block">{creed.lines!.map((line, i) => <p key={i}>{line}</p>)}</div>}
      {creed.kind === "numbered" && <ol className="creed-numbered">{creed.items!.map(item => <li key={item.n}><span className="creed-num">{item.n}</span><span>{item.text}</span></li>)}</ol>}
    </article>
  </div>;
}
