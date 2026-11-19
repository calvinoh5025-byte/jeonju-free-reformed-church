import Link from "next/link";
import type { ReactNode } from "react";
import { FootnoteText as ClientFootnoteText } from "./footnote-text";
import { ReadingControls } from "./reading-controls";

type Notes = Record<string, { ref: string; verses: { label: string; text: string | null }[] }>;
type Lines = string[];
function pick(text: string, notes?: Notes): Notes | undefined { if (!notes) return undefined; const out: Notes = {}; for (const m of text.matchAll(/\[\[(\d+)\]\]/g)) { const n = notes[m[1]]; if (n) out[m[1]] = n; } return Object.keys(out).length ? out : undefined; }
function FootnoteText({ text, notes }: { text: string; notes?: object }) { const own = pick(text, notes as Notes | undefined); return own ? <ClientFootnoteText text={text} notes={own}/> : <>{text}</>; }
export function ConfessionShell({ children }: { children: ReactNode }) { return <><ReadingControls/><div className="confession-reading">{children}</div></>; }
export function LinesText({ lines, notes }: { lines: Lines; notes?: object }) { return <div className="confession-lines">{lines.map((line,index)=><p key={index}><FootnoteText text={line} notes={notes}/></p>)}</div>; }
export function HeidelbergList({ days }: { days: {n:number;part:string|null;heading:string|null;qas:{n:number;q:string[];a:string[]}[]}[] }) {
  let priorPart=""; return <div className="confession-list">{days.map(day=>{const start=day.qas[0]?.n,end=day.qas[day.qas.length-1]?.n;const newPart=day.part&&day.part!==priorPart; if(day.part) priorPart=day.part; return <section key={day.n}>{newPart&&<h2>{day.part}</h2>}{day.heading&&<h3>{day.heading}</h3>}<Link className="confession-list-card" href={`/confessions/heidelberg/${day.n}`}><strong>제{day.n}주 · {start}–{end}문</strong><span>{day.qas[0]?.q.join(" ")}</span><span>열기 →</span></Link></section>})}</div>;
}
export function BelgicList({ articles }: { articles: {n:number;title:string}[] }) { return <div className="confession-list belgic-list">{articles.map(article=><Link className="confession-list-card" href={`/confessions/belgic/${article.n}`} key={article.n}><strong>제{article.n}항</strong><span>{article.title}</span><span>읽기 →</span></Link>)}</div>; }
export function HeidelbergQA({ qa, notes }: { qa: {n:number;q:string[];a:string[]}; notes?: object }) { return <article><h2>제 {qa.n} 문</h2><div className="confession-lines"><p className="confession-question">{qa.q.map((line,index)=><span key={index}><FootnoteText text={line} notes={notes}/><br/></span>)}</p><p className="confession-answer">{qa.a.map((line,index)=><span key={index}><FootnoteText text={line} notes={notes}/><br/></span>)}</p></div></article>; }
