"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type BookMeta = { slug: string; ko: string; chapters: number };
type BookText = { book: string; name: string; chapters: string[][] };

export function BibleReader({ book, previous, next }: { book: BookMeta; previous: BookMeta | null; next: BookMeta | null }) {
  const [text, setText] = useState<BookText | null>(null);
  const [failed, setFailed] = useState(false);
  const [chapter, setChapter] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(20);
  const [jump, setJump] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);
  const [wanted, setWanted] = useState<number | null>(null);
  const textTop = useRef<HTMLDivElement | null>(null);
  const scrollNext = useRef(false);

  useEffect(() => {
    try { const saved = Number(localStorage.getItem("worship-font-size")); if (saved >= 16 && saved <= 32) setFontSize(saved); } catch {}
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const asked = Number(search.get("c"));
    const verse = Number(search.get("v"));
    if (!Number.isInteger(asked) || asked < 1 || asked > book.chapters) return;
    setChapter(asked);
    setPickerOpen(false);
    setWanted(Number.isInteger(verse) && verse >= 1 ? verse : null);
  }, [book.slug, book.chapters]);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ slug: string; chapter: number; verse: number }>).detail;
      if (!detail || detail.slug !== book.slug) return;
      setChapter(detail.chapter);
      setPickerOpen(false);
      setWanted(detail.verse);
    };
    window.addEventListener("bible-goto", open);
    return () => window.removeEventListener("bible-goto", open);
  }, [book.slug]);

  useEffect(() => {
    let live = true;
    setText(null);
    setFailed(false);
    fetch(`/bible/${book.slug}.json`)
      .then(response => { if (!response.ok) throw new Error("not found"); return response.json(); })
      .then((data: BookText) => { if (live) setText(data); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [book.slug]);

  useEffect(() => {
    if (scrollNext.current && chapter && text) {
      scrollNext.current = false;
      textTop.current?.scrollIntoView({ block: "start" });
    }
  }, [chapter, text]);

  const openChapter = useCallback((n: number) => {
    setChapter(n);
    setPickerOpen(false);
    setWanted(null);
    scrollNext.current = true;
    try { window.history.replaceState(null, "", `?c=${n}`); } catch {}
  }, []);

  const changeSize = (delta: number) => setFontSize(current => {
    const size = Math.max(16, Math.min(32, current + delta));
    try { localStorage.setItem("worship-font-size", String(size)); } catch {}
    return size;
  });

  const goToChapter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const n = Number(jump);
    if (Number.isInteger(n) && n >= 1 && n <= book.chapters) openChapter(n);
  };

  const verses = chapter && text ? text.chapters[chapter - 1] : null;

  useEffect(() => {
    if (!verses || !wanted) return;
    const found = document.getElementById(`v${wanted}`);
    if (!found) return;
    scrollNext.current = false;
    found.scrollIntoView({ block: "center" });
    found.classList.add("bible-verse-found");
    const timer = window.setTimeout(() => found.classList.remove("bible-verse-found"), 5000);
    return () => window.clearTimeout(timer);
  }, [verses, wanted]);

  return <>
    <div className="worship-reader-tools"><button type="button" onClick={() => changeSize(-2)}>가−</button><button type="button" onClick={() => changeSize(2)}>가+</button></div>

    <details className="bible-chapters" open={pickerOpen} onToggle={event => setPickerOpen(event.currentTarget.open)}>
      <summary>{chapter ? `장 고르기 — 지금 ${chapter}장` : `장 고르기 — 전 ${book.chapters}장`}</summary>
      <form className="worship-number-form" onSubmit={goToChapter}><label htmlFor="bible-chapter">장 바로가기</label><input id="bible-chapter" type="number" min="1" max={book.chapters} value={jump} onChange={event => setJump(event.target.value)} /><button type="submit">이동</button></form>
      <div className="bible-chapter-grid">
        {Array.from({ length: book.chapters }, (unused, index) => index + 1).map(n => <button type="button" key={n} aria-current={n === chapter ? "true" : undefined} onClick={() => openChapter(n)}>{n}</button>)}
      </div>
    </details>

    <div className="bible-anchor" ref={textTop} />

    {failed && <p className="bible-notice">본문을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.</p>}
    {!failed && chapter && !verses && <p className="bible-notice">본문을 불러오는 중입니다…</p>}

    {chapter && verses && <>
      <header className="worship-reader-title"><div><h2>{book.ko} {chapter}장</h2></div><small>{verses.length}절</small></header>
      <div className="bible-verses" style={{ fontSize }}>
        {verses.map((verse, index) => <p id={`v${index + 1}`} key={index}><b>{index + 1}</b><span>{verse}</span></p>)}
      </div>
      <nav className="worship-reader-nav" aria-label="장 이동">
        {chapter > 1
          ? <button type="button" onClick={() => openChapter(chapter - 1)}>← {chapter - 1}장</button>
          : previous ? <Link href={`/worship/bible/${previous.slug}?c=${previous.chapters}`}>← {previous.ko}</Link> : <span />}
        <Link href="/worship/bible">책 목록</Link>
        {chapter < book.chapters
          ? <button type="button" onClick={() => openChapter(chapter + 1)}>{chapter + 1}장 →</button>
          : next ? <Link href={`/worship/bible/${next.slug}?c=1`}>{next.ko} →</Link> : <span />}
      </nav>
    </>}

    <p className="bible-credit">성경전서 개역한글판 · 대한성서공회</p>
  </>;
}
