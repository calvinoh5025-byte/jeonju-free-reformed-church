const items = [
  { title: "새가족 안내", detail: "처음 오신 분을 위한 교회와 신앙생활 안내", hash: "welcome" },
  { title: "개혁교회 설교 자료실", detail: "TheSeed 공개 설교 2,821건 · 본문과 설교자 검색", hash: "sermons" },
  { title: "클라리온 잡지", detail: "1973–2024년 공개 잡지와 연간 색인 1,314건", hash: "clarion" },
];

export function LearningResources() {
  return <section className="content-section" aria-labelledby="learning-title">
    <p className="section-kicker">LEARN TOGETHER</p>
    <h2 id="learning-title">새가족 안내와 함께 배우는 신앙</h2>
    <div className="resource-grid">
      {items.map(item => <article className="resource-card" key={item.hash}>
        <div className="file-badge">READ</div>
        <div><h3>{item.title}</h3><p>{item.detail}</p></div>
        <div className="resource-actions"><a className="button primary" href={`/guide/index.html#${item.hash}`}>자료 보기 →</a></div>
      </article>)}
    </div>
  </section>;
}
