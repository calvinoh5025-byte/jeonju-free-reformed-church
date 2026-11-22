import Link from "next/link";
import data from "./church-order-data.json";

const chapters = [
  { number: "I", title: "서론", first: 1, last: 1 },
  { number: "II", title: "직분과 교리 감독", first: 2, last: 28 },
  { number: "III", title: "회의 소집", first: 29, last: 51 },
  { number: "IV", title: "예배, 성례와 예식", first: 52, last: 65 },
  { number: "V", title: "그리스도의 권징", first: 66, last: 76 },
];
const base = "/resources/read/church-order";

export function ChurchOrderList() {
  return <>
    <p className="confession-intro">자유개혁 교회질서를 조별로 읽습니다. 원하는 조를 눌러 보세요.</p>
    <div className="confession-list belgic-list">
      <Link className="confession-list-card" href={`${base}/preface`}><strong>총강</strong><span>교회질서에 앞서 있는 글</span></Link>
      <Link className="confession-list-card" href={`${base}/all`}><strong>전체</strong><span>한 페이지로 이어서 읽기</span></Link>
    </div>
    {chapters.map(chapter => <section key={chapter.number} aria-labelledby={`chapter-${chapter.number}`}>
      <h2 id={`chapter-${chapter.number}`} style={{ font: '500 24px "Noto Serif KR", serif', margin: "32px 0 12px" }}>{chapter.number}. {chapter.title}</h2>
      <div className="confession-list belgic-list">
        {data.articles.filter(article => article.number >= chapter.first && article.number <= chapter.last).map(article => <Link className="confession-list-card" href={`${base}/${article.number}`} key={article.number}><strong>제{article.number}조</strong><span>{article.title}</span></Link>)}
      </div>
    </section>)}
    <p style={{ textAlign: "center", margin: "30px 0 0", fontSize: 14 }}><a href="/resources/church-order.pdf" target="_blank" rel="noreferrer">원본 PDF 보기·다운로드</a></p>
  </>;
}
