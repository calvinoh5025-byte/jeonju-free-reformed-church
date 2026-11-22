"use client";

import { useState } from "react";
import data from "./church-order-data.json";

const chapters = [
  { number: "I", title: "서론", first: 1, last: 1 },
  { number: "II", title: "직분과 교리 감독", first: 2, last: 28 },
  { number: "III", title: "회의 소집", first: 29, last: 51 },
  { number: "IV", title: "예배, 성례와 예식", first: 52, last: 65 },
  { number: "V", title: "그리스도의 권징", first: 66, last: 76 },
];

export function ChurchOrderText() {
  const [fontSize, setFontSize] = useState(18);
  return <section className="church-order-text" aria-label="자유개혁 교회질서 본문" style={{ maxWidth: 960, margin: "0 auto", padding: "20px clamp(18px, 5vw, 60px) 48px", color: "var(--ink, #263530)" }}>
    <div style={{ textAlign: "right", marginBottom: 12 }}>
      <button type="button" aria-label="글자 작게" onClick={() => setFontSize(value => Math.max(17, value - 1))} disabled={fontSize <= 17} style={{ minWidth: 44, minHeight: 44, marginRight: 8, font: "inherit" }}>가−</button>
      <span aria-live="polite" style={{ display: "inline-block", minWidth: 56, textAlign: "center" }}>{fontSize}px</span>
      <button type="button" aria-label="글자 크게" onClick={() => setFontSize(value => Math.min(30, value + 1))} disabled={fontSize >= 30} style={{ minWidth: 44, minHeight: 44, marginLeft: 8, font: "inherit" }}>가＋</button>
    </div>
    <p style={{ textAlign: "right", margin: "0 0 20px", fontSize: 13 }}><a href="/resources/church-order.pdf" target="_blank" rel="noreferrer">원본 PDF 보기·다운로드</a></p>
    <div style={{ fontSize, lineHeight: 1.9 }}>
      <section aria-labelledby="church-order-preface">
        <h2 id="church-order-preface" style={{ font: '500 24px "Noto Serif KR", serif', margin: "10px 0" }}>총강</h2>
        <p style={{ whiteSpace: "pre-wrap", margin: "0 0 32px" }}>{data.preface.replace(/^총강\n/, "")}</p>
      </section>
      <nav aria-label="교회질서 조 목록" style={{ margin: "0 0 36px", padding: 20, border: "1px solid #e5dccb", borderRadius: 14, background: "#fffcf5" }}>
        <h2 style={{ font: '500 24px "Noto Serif KR", serif', margin: "0 0 16px" }}>조 목록</h2>
        {chapters.map(chapter => <section key={chapter.number} style={{ marginTop: 20 }}>
          <h3 style={{ font: '500 20px "Noto Serif KR", serif', margin: "0 0 8px" }}>{chapter.number}. {chapter.title}</h3>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 6 }}>
            {data.articles.filter(article => article.number >= chapter.first && article.number <= chapter.last).map(article => <li key={article.number}>
              <a href={`#art-${article.number}`} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", border: "1px solid #e5dccb", borderRadius: 8, color: "inherit", textDecoration: "none", touchAction: "manipulation" }}>
                <strong style={{ whiteSpace: "nowrap" }}>제{article.number}조</strong><span>{article.title}</span>
              </a>
            </li>)}
          </ol>
        </section>)}
      </nav>
      {chapters.map(chapter => <section key={chapter.number} aria-labelledby={`chapter-${chapter.number}`} style={{ margin: "40px 0" }}>
        <h2 id={`chapter-${chapter.number}`} style={{ font: '500 25px "Noto Serif KR", serif', margin: "0 0 18px", color: "var(--forest, #29463f)" }}>{chapter.number}. {chapter.title}</h2>
        {data.articles.filter(article => article.number >= chapter.first && article.number <= chapter.last).map(article => <article id={`art-${article.number}`} key={article.number} tabIndex={-1} style={{ scrollMarginTop: 24, padding: "18px 0", borderTop: "1px solid #e5dccb" }}>
          <h3 style={{ font: '500 21px "Noto Serif KR", serif', margin: "0 0 8px" }}>제{article.number}조　{article.title}</h3>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{article.text}</p>
          <small style={{ display: "block", marginTop: 10, color: "#65716b" }}>PDF {article.page}쪽</small>
        </article>)}
      </section>)}
    </div>
    <p style={{ textAlign: "center", margin: "30px 0 0", fontSize: 13 }}><a href="/resources/church-order.pdf" target="_blank" rel="noreferrer">원본 PDF 보기·다운로드</a></p>
  </section>;
}

