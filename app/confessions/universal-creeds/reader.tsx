"use client";

import { useState } from "react";

const creeds = [
  { id: "apostles", title: "사도신경", firstPage: 1, lastPage: 1 },
  { id: "nicene", title: "니케아 신경", firstPage: 2, lastPage: 2 },
  { id: "athanasian", title: "아타나시우스 신경", firstPage: 3, lastPage: 4 },
];

export function UniversalCreedsReader() {
  const [selected, setSelected] = useState(creeds[0]);
  const [page, setPage] = useState(creeds[0].firstPage);

  function selectCreed(creed: typeof creeds[number]) {
    setSelected(creed);
    setPage(creed.firstPage);
  }

  return <div className="universal-creed-reader">
    <nav className="universal-creed-choices" aria-label="보편 신경 선택">
      {creeds.map(creed => <button
        key={creed.id}
        type="button"
        className="universal-creed-choice"
        aria-pressed={selected.id === creed.id}
        onClick={() => selectCreed(creed)}
      >{creed.title}</button>)}
    </nav>

    <div className="universal-creed-reader-heading">
      <h2>{selected.title}</h2>
      {selected.firstPage !== selected.lastPage && <nav className="universal-creed-pages" aria-label={`${selected.title} 쪽 선택`}>
        <button type="button" disabled={page === selected.firstPage} onClick={() => setPage(current => Math.max(selected.firstPage, current - 1))}>이전 쪽</button>
        <span>{page - selected.firstPage + 1} / {selected.lastPage - selected.firstPage + 1}쪽</span>
        <button type="button" disabled={page === selected.lastPage} onClick={() => setPage(current => Math.min(selected.lastPage, current + 1))}>다음 쪽</button>
      </nav>}
    </div>

    <iframe
      key={`${selected.id}-${page}`}
      title={`${selected.title} 원문`}
      src={`/resources/universal-creeds-section.pdf#page=${page}&view=FitH`}
      loading="lazy"
      className="universal-creed-frame"
    />
    <p className="universal-creed-caption">원문 PDF를 표시합니다. PDF 도구 모음에서 확대하거나 내려받을 수 있습니다.</p>
    <a className="universal-creed-fallback" href={`/resources/universal-creeds-section.pdf#page=${page}`} target="_blank" rel="noreferrer">PDF 원문 새 창에서 열기 ↗</a>
  </div>;
}
