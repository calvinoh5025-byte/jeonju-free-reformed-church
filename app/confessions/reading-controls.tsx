"use client";
import { useEffect, useState } from "react";
export function ReadingControls() {
  const [size, setSize] = useState(18);
  useEffect(() => { try { const saved = Number(localStorage.getItem("worship-font-size")); if (saved >= 16 && saved <= 32) { setSize(saved); document.documentElement.style.setProperty("--confession-font-size", `${saved}px`); } else { document.documentElement.style.setProperty("--confession-font-size", "18px"); } } catch {} }, []);
  const update = (delta: number) => setSize(current => { const next=Math.max(16,Math.min(32,current+delta)); try { localStorage.setItem("worship-font-size",String(next)); } catch {} document.documentElement.style.setProperty("--confession-font-size",`${next}px`); return next; });
  return <div className="confession-size-controls"><button type="button" onClick={()=>update(-2)}>가−</button><button type="button" onClick={()=>update(2)}>가+</button></div>;
}
