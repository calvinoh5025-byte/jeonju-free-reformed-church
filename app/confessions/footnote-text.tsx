"use client";

import { useEffect, useId, useRef, useState } from "react";
type Verse = { label: string; text: string | null };
type Note = { ref: string; verses: Verse[] };
type Notes = Record<string, Note>;

export function FootnoteText({ text, notes }: { text: string; notes?: Notes }) {
  const [open, setOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const anchors = useRef<Record<string, HTMLButtonElement | null>>({});
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
  useEffect(() => {
    if (!open || !anchors.current[open] || window.matchMedia("(max-width: 620px)").matches) return;
    const update = () => {
      const activeAnchor = anchors.current[open];
      if (!activeAnchor) return;
      const rect = activeAnchor.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 16));
      const above = rect.top > window.innerHeight / 2;
      const top = above
        ? Math.max(8, rect.top - 12)
        : Math.max(8, Math.min(rect.bottom + 12, window.innerHeight * 0.5 - 8));
      setPosition({ left, top, above });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open]);
  const show = (number: string, pin = false) => { window.dispatchEvent(new CustomEvent("confession-footnote-open", { detail: owner })); setOpen(number); setPinned(pin); };
  const parts = text.split(/\[\[(\d+)\]\]/g);
  return <>{parts.map((part, index) => {
    if (index % 2 === 0) return <span key={`text-${index}`}>{part}</span>;
    const note = notes?.[part]; if (!note) return null;
    const expanded = open === part;
    return <span className="confession-footnote" key={`note-${index}`} onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) show(part); }} onMouseLeave={() => { if (window.matchMedia("(hover: hover)").matches && open === part && !pinned) setOpen(null); }}>
      <button ref={element => { anchors.current[part] = element; }} type="button" className="footnote-mark" aria-expanded={expanded} aria-label={`각주 ${part}: ${note.ref}`} onClick={event => { event.stopPropagation(); if (expanded && pinned) { setOpen(null); setPinned(false); } else show(part, true); }}>[{part}]</button>
      {expanded && <span className={`footnote-popover${position ? " footnote-popover-positioned" : ""}`} style={position ? { left: position.left, top: position.top, transform: position.above ? "translateY(-100%)" : "none" } : undefined} role="dialog" aria-label={`각주 ${part}`}><strong>{note.ref}</strong>{note.verses.map((verse, verseIndex) => <span className="footnote-verse" key={`${verse.label}-${verseIndex}`}>{note.verses.length > 1 && <b>{verse.label}</b>}{verse.text && <span>{verse.text}</span>}</span>)}<small>개역한글</small></span>}
    </span>;
  })}</>;
}
