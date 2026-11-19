import type { Metadata } from "next";
import { notFound } from "next/navigation";
import data from "../../data/heidelberg.json";
import { ConfessionShell, HeidelbergQA } from "../../confession-view";
import { DaySelect } from "../../day-select";
import { ItemNavigation, PageContent, PageFrame } from "../../page-frame";
export const generateStaticParams = () => data.lordsDays.map(day => ({ ld: String(day.n) }));
export async function generateMetadata({ params }: { params: Promise<{ld:string}> }): Promise<Metadata> { const {ld}=await params; return { title: `하이델베르크 교리문답 제${ld}주` }; }
export default async function HeidelbergDayPage({ params }: { params: Promise<{ld:string}> }) { const {ld}=await params; const day=data.lordsDays.find(item=>item.n===Number(ld)); if(!day) notFound(); return <PageFrame title={`제${day.n}주`} kicker="HEIDELBERG CATECHISM" description={day.heading ?? day.part ?? "하이델베르크 교리문답"}><PageContent><ConfessionShell><div className="confession-questions">{day.qas.map(qa=><HeidelbergQA key={qa.n} qa={qa} notes={day.notes}/>)}</div><ItemNavigation list="/confessions/heidelberg" previous={day.n>1?`/confessions/heidelberg/${day.n-1}`:undefined} next={day.n<data.lordsDays.length?`/confessions/heidelberg/${day.n+1}`:undefined} previousLabel="이전 주일" nextLabel="다음 주일"/><DaySelect current={day.n} maximum={data.lordsDays.length}/></ConfessionShell></PageContent></PageFrame>; }
