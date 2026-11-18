"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

type LinkOverlay = { id: string; pairId: string | null; label: string | null; left: number; top: number; width: number; height: number; dest: string | unknown[] };
type PendingJump = { page: number; pairId: string | null; left: number | null; top: number | null; token: number };
type TargetHighlight = { label: string | null; left: number; top: number; width: number; height: number };
type SearchPage = { page: number; count: number };
type SearchHighlight = { id: string; left: number; top: number; width: number; height: number };
type SearchGlyph = { itemIndex: number; left: number; right: number; top: number; height: number };

const normalizeSearchText = (value: string) => value.normalize("NFC").replace(/\s+/g, "").toLocaleLowerCase("ko-KR");

const mapSearchText = (value: string) => {
  const original = value.normalize("NFC");
  const originalIndexes: number[] = [];
  let normalized = "";
  for (let index = 0; index < original.length; index += 1) {
    const character = original[index];
    if (/\s/u.test(character)) continue;
    const lowered = character.toLocaleLowerCase("ko-KR");
    normalized += lowered;
    for (let part = 0; part < lowered.length; part += 1) originalIndexes.push(index);
  }
  return { original, normalized, originalIndexes };
};

export function PdfViewer({ file, title }: { file: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(0);
  const [links, setLinks] = useState<LinkOverlay[]>([]);
  const [pendingJump, setPendingJump] = useState<PendingJump | null>(null);
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [targetHighlight, setTargetHighlight] = useState<TargetHighlight | null>(null);
  const [zoom, setZoom] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPages, setSearchPages] = useState<SearchPage[]>([]);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchHighlights, setSearchHighlights] = useState<SearchHighlight[]>([]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 620px)").matches) setZoom(1.5);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setWidth(Math.min(900, Math.max(280, frame.clientWidth - 32)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof import("pdfjs-dist/build/pdf.mjs").getDocument> | undefined;
    import("pdfjs-dist/build/pdf.mjs").then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      task = pdfjs.getDocument({
        url: file,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
      });
      return task.promise;
    }).then(document => {
      if (!active) return;
      setPdf(document);
      setTotal(document.numPages);
      setPage(1);
    }).catch(() => active && setError("문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."));
    return () => { active = false; task?.destroy(); };
  }, [file]);

  useEffect(() => {
    if (!pdf || !width || !canvasRef.current) return;
    let renderTask: RenderTask | undefined;
    let active = true;
    pdf.getPage(page).then(pdfPage => {
      if (!active || !canvasRef.current) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = (width / base.width) * zoom;
      const viewport = pdfPage.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      if (pageRef.current) {
        pageRef.current.style.width = `${Math.floor(viewport.width)}px`;
        pageRef.current.style.height = `${Math.floor(viewport.height)}px`;
      }
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      return Promise.all([renderTask.promise, pdfPage.getAnnotations({ intent: "display" }), pdfPage.getTextContent()]).then(([, annotations, textContent]) => {
        if (!active) return;
        const pageLinks = annotations.flatMap((annotation, index) => {
          if (annotation.subtype !== "Link" || !annotation.dest || !annotation.rect) return [];
          const converted = viewport.convertToViewportRectangle(annotation.rect);
          const metadata = (annotation as typeof annotation & { contentsObj?: { str?: string } }).contentsObj?.str ?? "";
          const [pairId = null, label = null] = metadata ? metadata.split("|") : [];
          return [{
            id: `${page}-${index}`,
            pairId,
            label,
            left: Math.min(converted[0], converted[2]),
            top: Math.min(converted[1], converted[3]),
            width: Math.max(12, Math.abs(converted[2] - converted[0])),
            height: Math.max(14, Math.abs(converted[3] - converted[1])),
            dest: annotation.dest as string | unknown[],
          }];
        });
        setLinks(pageLinks);
        const query = normalizeSearchText(searchTerm);
        const pageHighlights: SearchHighlight[] = [];
        if (query) {
          let pageSearchText = "";
          const searchGlyphs: SearchGlyph[] = [];
          textContent.items.forEach((item, itemIndex) => {
            if (!("str" in item) || !("transform" in item) || !("width" in item) || !("height" in item) || !("fontName" in item)) return;
            const mappedText = mapSearchText(item.str);
            if (!mappedText.normalized) return;
            const [originX, originY] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            const fullWidth = Math.max(1, item.width * scale);
            const fontHeight = Math.max(1, Math.hypot(item.transform[2], item.transform[3]) * scale);
            const fontStyle = textContent.styles[item.fontName];
            const ascentRatio = fontStyle?.ascent ?? (fontStyle?.descent ? 1 + fontStyle.descent : 0.8);
            const characterWidth = fullWidth / Math.max(1, mappedText.original.length);
            pageSearchText += mappedText.normalized;
            mappedText.originalIndexes.forEach(originalIndex => {
              const left = originX + characterWidth * originalIndex;
              searchGlyphs.push({
                itemIndex,
                left,
                right: left + characterWidth,
                top: originY - fontHeight * ascentRatio,
                height: fontHeight,
              });
            });
          });

          let occurrence = pageSearchText.indexOf(query);
          let matchIndex = 0;
          while (occurrence >= 0) {
            const matchedGlyphs = searchGlyphs.slice(occurrence, occurrence + query.length);
            let segmentStart = 0;
            for (let index = 1; index <= matchedGlyphs.length; index += 1) {
              const previous = matchedGlyphs[index - 1];
              const current = matchedGlyphs[index];
              if (current && previous && current.itemIndex === previous.itemIndex) continue;
              const segment = matchedGlyphs.slice(segmentStart, index);
              if (segment.length) {
                const left = Math.min(...segment.map(glyph => glyph.left));
                const right = Math.max(...segment.map(glyph => glyph.right));
                const top = Math.min(...segment.map(glyph => glyph.top));
                const bottom = Math.max(...segment.map(glyph => glyph.top + glyph.height));
                pageHighlights.push({
                  id: `${page}-${matchIndex}-${segmentStart}`,
                  left,
                  top,
                  width: Math.max(2, right - left),
                  height: Math.max(2, bottom - top),
                });
              }
              segmentStart = index;
            }
            matchIndex += 1;
            occurrence = pageSearchText.indexOf(query, occurrence + Math.max(1, query.length));
          }
        }
        setSearchHighlights(pageHighlights);
        if (pendingJump?.page === page && pendingJump.top !== null) {
          const jumpY = viewport.convertToViewportPoint(0, pendingJump.top)[1];
          const jumpX = pendingJump.left === null ? 0 : viewport.convertToViewportPoint(pendingJump.left, pendingJump.top)[0];
          const pairedLink = pendingJump.pairId
            ? pageLinks.find(link => link.pairId === pendingJump.pairId && link.id !== activeLinkId) ?? null
            : null;
          const closestLink = pairedLink ?? pageLinks.reduce<LinkOverlay | null>((closest, link) => {
            const distance = Math.hypot(link.left + link.width / 2 - jumpX, link.top + link.height / 2 - jumpY);
            if (!closest) return link;
            const closestDistance = Math.hypot(closest.left + closest.width / 2 - jumpX, closest.top + closest.height / 2 - jumpY);
            return distance < closestDistance ? link : closest;
          }, null);
          setTargetHighlight(closestLink
            ? { label: closestLink.label, left: closestLink.left, top: closestLink.top, width: closestLink.width, height: closestLink.height }
            : { label: null, left: Math.max(0, jumpX - 5), top: Math.max(0, jumpY - 15), width: 24, height: 22 });
          requestAnimationFrame(() => {
            const element = pageRef.current;
            if (element) window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + jumpY - 90, behavior: "smooth" });
          });
        }
      });
    }).then(() => active && setLoading(false)).catch(reason => {
      if (reason?.name !== "RenderingCancelledException" && active) setError("페이지를 표시하지 못했습니다.");
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [pdf, page, width, pendingJump, zoom, searchTerm]);

  const goToSearchResult = (index: number, results = searchPages) => {
    if (!results.length) return;
    const nextIndex = (index + results.length) % results.length;
    setSearchIndex(nextIndex);
    setLoading(true);
    setPage(results[nextIndex].page);
    setActiveLinkId(null);
    setTargetHighlight(null);
    setPendingJump(null);
    frameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const findText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (!pdf || !query || searching) return;
    setSearching(true);
    setSearchMessage("문서 전체를 찾는 중입니다…");
    setSearchPages([]);
    setSearchIndex(-1);
    setSearchTerm(query);
    const normalizedQuery = normalizeSearchText(query);
    const results: SearchPage[] = [];
    try {
      for (let firstPage = 1; firstPage <= pdf.numPages; firstPage += 8) {
        const pageNumbers = Array.from({ length: Math.min(8, pdf.numPages - firstPage + 1) }, (_, index) => firstPage + index);
        const batch = await Promise.all(pageNumbers.map(async pageNumber => {
          const pdfPage = await pdf.getPage(pageNumber);
          const content = await pdfPage.getTextContent();
          const pageText = normalizeSearchText(content.items.map(item => "str" in item ? item.str : "").join(""));
          let count = 0;
          let position = pageText.indexOf(normalizedQuery);
          while (position >= 0) {
            count += 1;
            position = pageText.indexOf(normalizedQuery, position + Math.max(1, normalizedQuery.length));
          }
          return count ? { page: pageNumber, count } : null;
        }));
        results.push(...batch.filter((result): result is SearchPage => result !== null));
      }
      setSearchPages(results);
      if (results.length) {
        const totalMatches = results.reduce((sum, result) => sum + result.count, 0);
        setSearchMessage(`${totalMatches}개 일치 · ${results.length}쪽`);
        goToSearchResult(0, results);
      } else {
        setSearchMessage("일치하는 글자가 없습니다.");
        setSearchHighlights([]);
      }
    } catch {
      setSearchMessage("검색 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setSearchPages([]);
    setSearchIndex(-1);
    setSearchMessage("");
    setSearchHighlights([]);
  };

  const changeZoom = (next: number) => {
    setLoading(true);
    setZoom(Math.min(2.5, Math.max(1, next)));
  };

  const move = (next: number) => {
    setLoading(true);
    setActiveLinkId(null);
    setTargetHighlight(null);
    setPendingJump(null);
    setPage(Math.min(total, Math.max(1, next)));
    frameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const followLink = async (linkId: string, pairId: string | null, rawDestination: string | unknown[]) => {
    if (!pdf) return;
    const destination = typeof rawDestination === "string" ? await pdf.getDestination(rawDestination) : rawDestination;
    if (!destination || destination[0] === undefined || destination[0] === null) return;
    const reference = destination[0];
    // PDF destinations may point to either an indirect page reference or a
    // zero-based page number. The generated confession PDFs use page numbers.
    const destinationPage = typeof reference === "number"
      ? reference + 1
      : (await pdf.getPageIndex(reference as Parameters<PDFDocumentProxy["getPageIndex"]>[0])) + 1;
    const left = typeof destination[2] === "number" ? destination[2] : null;
    const top = typeof destination[3] === "number" ? destination[3] : null;
    setLoading(true);
    setActiveLinkId(linkId);
    setTargetHighlight(null);
    setPage(destinationPage);
    setPendingJump({ page: destinationPage, pairId, left, top, token: Date.now() });
  };

  const clearHighlights = () => {
    setActiveLinkId(null);
    setTargetHighlight(null);
    setPendingJump(null);
  };

  return <section className="document-reader" aria-label={`${title} 원문 열람`} onPointerDown={event => {
    const target = event.target as Element;
    if (!target.closest(".pdf-footnote-link")) clearHighlights();
  }}>
    <div className="reader-controls">
      <div className="reader-toolbar">
        <button type="button" onClick={() => move(page - 1)} disabled={page <= 1}>← 이전</button>
        <strong aria-live="polite">{total ? `${page} / ${total}쪽` : "불러오는 중"}</strong>
        <button type="button" onClick={() => move(page + 1)} disabled={!total || page >= total}>다음 →</button>
      </div>
    </div>
    <div className="reader-zoom" aria-label="문서 확대 및 축소">
      <button type="button" aria-label="축소" onClick={() => changeZoom(zoom - 0.25)} disabled={zoom <= 1}>−</button>
      <strong aria-live="polite">{Math.round(zoom * 100)}%</strong>
      <button type="button" aria-label="확대" onClick={() => changeZoom(zoom + 0.25)} disabled={zoom >= 2.5}>＋</button>
      <button type="button" className="reader-fit" onClick={() => changeZoom(1)}>화면 맞춤</button>
    </div>
    <div className="reader-frame" ref={frameRef}>
      {loading && !error && <p className="reader-loading">페이지를 불러오는 중입니다…</p>}
      {error && <p className="reader-error">{error}</p>}
      <div className="reader-page" ref={pageRef}>
        <canvas ref={canvasRef} aria-label={`${title} ${page}쪽`} />
        {links.map(link => <button key={link.id} className={`pdf-footnote-link${activeLinkId === link.id ? " active" : ""}`} type="button" title="연결된 항목으로 이동" aria-label={link.label ? `${link.label}번 연결 항목으로 이동` : "연결된 항목으로 이동"} style={{ left: link.left, top: link.top, width: link.width, height: link.height, fontSize: Math.max(11, link.height * .86) }} onClick={() => followLink(link.id, link.pairId, link.dest)}>{activeLinkId === link.id ? link.label : ""}</button>)}
        {targetHighlight && <span className="pdf-footnote-target" aria-hidden="true" style={{ left: targetHighlight.left, top: targetHighlight.top, width: targetHighlight.width, height: targetHighlight.height, fontSize: Math.max(11, targetHighlight.height * .86) }}>{targetHighlight.label}</span>}
        {searchHighlights.map(highlight => <mark key={highlight.id} className="pdf-search-highlight" aria-hidden="true" style={{ left: highlight.left, top: highlight.top, width: highlight.width, height: highlight.height }} />)}
      </div>
    </div>
    <div className="reader-toolbar bottom">
      <button type="button" onClick={() => move(page - 1)} disabled={page <= 1}>← 이전</button>
      <strong>{total ? `${page} / ${total}쪽` : ""}</strong>
      <button type="button" onClick={() => move(page + 1)} disabled={!total || page >= total}>다음 →</button>
    </div>
    <form className="reader-search reader-search-bottom" onSubmit={findText}>
      <label htmlFor="pdf-search">원문 찾기</label>
      <input id="pdf-search" type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="찾을 단어나 글씨 입력" autoComplete="off" />
      <button type="submit" disabled={!pdf || !searchInput.trim() || searching}>{searching ? "찾는 중" : "찾기"}</button>
      {searchMessage && <div className="reader-search-status" aria-live="polite">
        <span>{searchMessage}{searchPages.length && searchIndex >= 0 ? ` · 현재 ${searchPages[searchIndex].page}쪽` : ""}</span>
        {searchPages.length > 0 && <>
          <button type="button" aria-label="이전 검색 결과" onClick={() => goToSearchResult(searchIndex - 1)}>↑</button>
          <button type="button" aria-label="다음 검색 결과" onClick={() => goToSearchResult(searchIndex + 1)}>↓</button>
        </>}
        <button type="button" className="reader-search-clear" onClick={clearSearch}>지우기</button>
      </div>}
    </form>
  </section>;
}
