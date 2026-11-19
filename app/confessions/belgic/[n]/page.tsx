import type { Metadata } from "next";
import { notFound } from "next/navigation";
import data from "../../data/belgic.json";
import { ConfessionShell, LinesText } from "../../confession-view";
import { ItemNavigation, PageContent, PageFrame } from "../../page-frame";
export const generateStaticParams = () => data.articles.map(article => ({ n: String(article.n) }));
export async function generateMetadata({ params }: { params: Promise<{n:string}> }): Promise<Metadata> { const {n}=await params; const article=data.articles.find(item=>item.n===Number(n)); return {title:article?.title ?? "벨직 신앙고백서"}; }
export default async function BelgicArticlePage({ params }: { params: Promise<{n:string}> }) { const {n}=await params; const article=data.articles.find(item=>item.n===Number(n)); if(!article) notFound(); return <PageFrame title={`제${article.n}항. ${article.title}`} kicker="BELGIC CONFESSION" description="벨직 신앙고백서"><PageContent><ConfessionShell><LinesText lines={article.paragraphs} notes={article.notes}/><ItemNavigation list="/confessions/belgic" previous={article.n>1?`/confessions/belgic/${article.n-1}`:undefined} next={article.n<data.articles.length?`/confessions/belgic/${article.n+1}`:undefined} previousLabel="이전 항" nextLabel="다음 항"/></ConfessionShell></PageContent></PageFrame>; }
