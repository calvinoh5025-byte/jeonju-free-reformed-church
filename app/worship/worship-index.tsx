"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Item = { n: number; title: string; stanzas: { n: number; lines: string[] }[] };
export function WorshipIndex({ kind, items }: { kind: "psalms" | "hymns"; items: Item[] }) {
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState("");
  const label = kind === "psalms" ? "시편" : "찬송";
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return items.flatMap(item => item.stanzas.flatMap(stanza => stanza.lines.flatMap((line, index) => line.toLocaleLowerCase().includes(term) ? [{ n: item.n, stanza: stanza.n, line: index + 1, text: line }] : [])));
  }, [items, query]);
  const goToNumber = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const n = Number(number); if (Number.isInteger(n) && n >= 1 && n <= items.length) location.href = `/worship/${kind}/${n}`; };
  return <section className="worship-index">
    <form className="worship-number-form" onSubmit={goToNumber}><label htmlFor="worship-number">번호 바로가기</label><input id="worship-number" type="number" min="1" max={items.length} value={number} onChange={event => setNumber(event.target.value)} /><button type="submit">이동</button></form>
    <div className="worship-number-grid" aria-label={`${label} 번호 목록`}>{items.map(item => <Link href={`/worship/${kind}/${item.n}`} key={item.n}><strong>{item.n}</strong>{item.title && <small>{item.title.slice(0, 12)}</small>}</Link>)}</div>
    <div className="worship-search"><label htmlFor="worship-search">가사 검색</label><input id="worship-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="가사에서 단어 찾기" />
      {query.trim() && <div className="worship-search-results" aria-live="polite">{results.length ? results.map((result, index) => <Link href={`/worship/${kind}/${result.n}`} key={`${result.n}-${result.stanza}-${result.line}-${index}`}>{label} {result.n}{kind === "psalms" ? "편" : "장"} {result.stanza}절 {result.text}</Link>) : <p>검색 결과가 없습니다.</p>}</div>}
    </div>
  </section>;
}
