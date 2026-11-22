import type { Metadata } from "next";
import { notFound } from "next/navigation";
import data from "../../[document]/church-order-data.json";
import { ChurchOrderText } from "../../[document]/church-order-text";
import { ConfessionShell } from "../../../../confessions/confession-view";
import { ItemNavigation, PageContent, PageFrame } from "../../../../confessions/page-frame";

const chapters = [
  { number: "I", title: "서론", first: 1, last: 1 },
  { number: "II", title: "직분과 교리 감독", first: 2, last: 28 },
  { number: "III", title: "회의 소집", first: 29, last: 51 },
  { number: "IV", title: "예배, 성례와 예식", first: 52, last: 65 },
  { number: "V", title: "그리스도의 권징", first: 66, last: 76 },
];
const base = "/resources/read/church-order";
const slugs = ["preface", ...data.articles.map(article => String(article.number)), "all"];

export const generateStaticParams = () => slugs.map(article => ({ article }));

type PageInfo = { title: string; description: string; previous?: string; previousLabel?: string; next?: string; nextLabel?: string };

function describe(slug: string): PageInfo | null {
  if (slug === "preface") return { title: "총강", description: "자유개혁 교회질서", next: `${base}/1`, nextLabel: "제1조" };
  if (slug === "all") return { title: "교회질서 전체", description: "한 페이지로 이어서 읽습니다." };
  const index = data.articles.findIndex(article => String(article.number) === slug);
  if (index < 0) return null;
  const article = data.articles[index];
  const chapter = chapters.find(item => article.number >= item.first && article.number <= item.last);
  const before = data.articles[index - 1];
  const after = data.articles[index + 1];
  return {
    title: `제${article.number}조 ${article.title}`,
    description: chapter ? `${chapter.number}. ${chapter.title}` : "자유개혁 교회질서",
    previous: before ? `${base}/${before.number}` : `${base}/preface`,
    previousLabel: before ? `제${before.number}조` : "총강",
    next: after ? `${base}/${after.number}` : undefined,
    nextLabel: after ? `제${after.number}조` : "",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ article: string }> }): Promise<Metadata> {
  const { article } = await params;
  const info = describe(article);
  return info ? { title: `${info.title} | 교회질서` } : {};
}

export default async function ChurchOrderArticlePage({ params }: { params: Promise<{ article: string }> }) {
  const { article: slug } = await params;
  const info = describe(slug);
  if (!info) notFound();
  if (slug === "all") {
    return <PageFrame title={info.title} kicker="CHURCH ORDER" description={info.description}><PageContent><ChurchOrderText /><ItemNavigation list={base} previousLabel="" nextLabel="" /></PageContent></PageFrame>;
  }
  const item = slug === "preface" ? null : data.articles.find(article => String(article.number) === slug);
  const paragraphs = item ? item.paragraphs : data.prefaceParagraphs;
  return <PageFrame title={info.title} kicker="CHURCH ORDER" description={info.description}>
    <PageContent>
      <ConfessionShell>
        <div className="confession-lines">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        {item && <p className="confession-intro" style={{ fontSize: 14 }}>원본 PDF {item.page}쪽</p>}
        <ItemNavigation previous={info.previous} next={info.next} list={base} previousLabel={info.previousLabel ?? ""} nextLabel={info.nextLabel ?? ""} />
      </ConfessionShell>
    </PageContent>
  </PageFrame>;
}
