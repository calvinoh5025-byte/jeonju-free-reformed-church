import type { Metadata } from "next";
import Link from "next/link";
import data from "../data/dort.json";
import { PageContent, PageFrame } from "../page-frame";
export const metadata: Metadata = { title: "돌트 신경" };
const slugs = ["1", "2", "3-4", "5"];
export default function DortPage() { return <PageFrame title="돌트 신경" kicker="CANONS OF DORT" description="교리별로 읽습니다."><PageContent><p className="confession-intro">{data.intro}</p><div className="confession-list dort-list">{data.heads.map((head,index)=><Link className="confession-list-card" href={`/confessions/dort/${slugs[index]}`} key={head.n}><strong>{["첫째 교리","둘째 교리","셋째와 넷째 교리","다섯째 교리"][index]}</strong><span>{head.title}</span></Link>)}<Link className="confession-list-card" href="/confessions/dort/conclusion"><strong>결론</strong><span>{data.conclusion.title}</span></Link></div></PageContent></PageFrame>; }
