"use client";

import { useEffect, useId, useState } from "react";
type Verse = { label: string; text: string | null };
type Note = { ref: string; verses: Verse[] };
type Notes = Record<string, Note>;

export function FootnoteText({ text, notes }: { text: string; notes?: Notes }) {
  const [open, setOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const owner = useId();
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") { setOpen(null); setPinned(false); }
      if (event instanceof MouseEvent && !(event.target as HTMLElement).closest(".confession-footnote")) { setOpen(null); setPinned(false); }
    };
    const another = (event: Event) => { if ((event as CustomEvent<string>).detail !== owner) { setOpen(null); setPinned(false); } };
    document.addEventListener("click", close); document.addEventListener("keydown", close);
    window.addEventListener("confession-footnote-open", another);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); window.removeEventListener("confession-footnote-open", another); };
  }, [owner]);
  const show = (number: string, pin = false) => { window.dispatchEvent(new CustomEvent("confession-footnote-open", { detail: owner })); setOpen(number); setPinned(pin); };
  const parts = text.split(/\[\[(\d+)\]\]/g);
  return <>{parts.map((part, index) => {
    if (index % 2 === 0) return <span key={`text-${index}`}>{part}</span>;
    const note = notes?.[part]; if (!note) return null;
    const expanded = open === part;
    return <span className="confession-footnote" key={`note-${index}`} onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) show(part); }} onMouseLeave={() => { if (window.matchMedia("(hover: hover)").matches && open === part && !pinned) setOpen(null); }}>
      <button type="button" className="footnote-mark" aria-expanded={expanded} aria-label={`각주 ${part}: ${note.ref}`} onClick={event => { event.stopPropagation(); if (expanded && pinned) { setOpen(null); setPinned(false); } else show(part, true); }}>[{part}]</button>
      {expanded && <span className="footnote-popover" role="dialog" aria-label={`각주 ${part}`}><strong>{note.ref}</strong>{note.verses.map((verse, verseIndex) => <span className="footnote-verse" key={`${verse.label}-${verseIndex}`}><b>{verse.label}</b>{verse.text && <span>{verse.text}</span>}</span>)}<small>개역한글</small></span>}
    </span>;
  })}</>;
}
