"use client";

import Link from "next/link";
import { FormEvent, Fragment, MouseEvent as ReactMouseEvent, useState } from "react";

type BookMeta = { slug: string; ko: string; chapters: number };
type BookText = { book: string; name: string; chapters: string[][] };
type Hit = { slug: string; ko: string; chapter: number; verse: number; text: string };

const cache = new Map<string, BookText>();
const LIMIT = 200;

async function loadBook(slug: string) {
  const held = cache.get(slug);
  if (held) return held;
  const response = await fetch(`/bible/${slug}.json`);
  if (!response.ok) throw new Error("not found");
  const data: BookText = await response.json();
  cache.set(slug, data);
  return data;
}

function Highlighted({ text, needle }: { text: string; needle: string }) {
  const parts = text.split(needle);
  return <>{parts.map((part, index) => <Fragment key={index}>{part}{index < parts.length - 1 && <mark>{needle}</mark>}</Fragment>)}</>;
}

export function BibleSearch({ books, current = null }: { books: BookMeta[]; current?: BookMeta | null }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "book">(current ? "book" : "all");
  const [needle, setNeedle] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const targets = scope === "book" && current ? [current] : books;

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const word = query.trim();
    if (!word) return;
    setBusy(true);
    setFailed(false);
    setHits(null);
    setNeedle(word);
    setProgress(0);
    const found: Hit[] = [];
    let counted = 0;
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const meta = targets[index];
        const data = await loadBook(meta.slug);
        data.chapters.forEach((verses, chapterIndex) => verses.forEach((verse, verseIndex) => {
          if (!verse.includes(word)) return;
          counted += 1;
          if (found.length < LIMIT) found.push({ slug: meta.slug, ko: meta.ko, chapter: chapterIndex + 1, verse: verseIndex + 1, text: verse });
        }));
        setProgress(index + 1);
      }
      setHits(found);
      setTotal(counted);
    } catch {
      setFailed(true);
      setHits(null);
    }
    setBusy(false);
  };

  const clear = () => { setQuery(""); setHits(null); setNeedle(""); setFailed(false); };

  // Inside the book already open, the reader is told directly: the route does not change.
  const open = (event: ReactMouseEvent<HTMLAnchorElement>, hit: Hit) => {
    if (!current || hit.slug !== current.slug) return;
    event.preventDefault();
    try { window.history.replaceState(null, "", `?c=${hit.chapter}&v=${hit.verse}`); } catch {}
    window.dispatchEvent(new CustomEvent("bible-goto", { detail: { slug: hit.slug, chapter: hit.chapter, verse: hit.verse } }));
  };

  return <section className="bible-search" aria-labelledby="bible-search-title">
    <h2 id="bible-search-title">말씀 찾기</h2>
    {current && <div className="bible-scope" role="group" aria-label="찾을 범위">
      <button type="button" aria-pressed={scope === "book"} onClick={() => setScope("book")}>{current.ko}에서</button>
      <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>성경 전체에서</button>
    </div>}
    <form className="bible-search-form" onSubmit={search}>
      <label className="sr-only" htmlFor="bible-search-input">찾을 낱말</label>
      <input id="bible-search-input" type="search" value={query} placeholder="예: 사랑, 목자, 은혜" onChange={event => setQuery(event.target.value)} />
      <button type="submit" disabled={busy || !query.trim()}>찾기</button>
      {(hits || failed) && <button type="button" className="bible-search-clear" onClick={clear}>지우기</button>}
    </form>
    {scope === "all" && !hits && !busy && <p className="bible-search-note">성경 전체에서 찾을 때는 본문을 내려받느라 처음 한 번은 조금 걸립니다.</p>}
    {busy && <p className="bible-search-note" aria-live="polite">찾는 중입니다… {targets.length > 1 && `${progress} / ${targets.length}권`}</p>}
    {failed && <p className="bible-search-note">본문을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.</p>}
    {hits && hits.length === 0 && <p className="bible-search-note">&ldquo;{needle}&rdquo; 이(가) 들어간 구절을 찾지 못했습니다.</p>}
    {hits && hits.length > 0 && <>
      <p className="bible-search-note" aria-live="polite">&ldquo;{needle}&rdquo; 이(가) 들어간 구절 {total}개{total > hits.length && ` 중 처음 ${hits.length}개`}</p>
      <ol className="bible-hits">
        {hits.map(hit => <li key={`${hit.slug}-${hit.chapter}-${hit.verse}`}>
          <Link href={`/worship/bible/${hit.slug}?c=${hit.chapter}&v=${hit.verse}`} onClick={event => open(event, hit)}>
            <strong>{hit.ko} {hit.chapter}:{hit.verse}</strong>
            <span><Highlighted text={hit.text} needle={needle} /></span>
          </Link>
        </li>)}
      </ol>
    </>}
  </section>;
}
