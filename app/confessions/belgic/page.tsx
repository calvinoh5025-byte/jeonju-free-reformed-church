import type { Metadata } from "next";
import data from "../data/belgic.json";
import { BelgicList } from "../confession-view";
import { PageContent, PageFrame } from "../page-frame";
export const metadata: Metadata = { title: "벨직 신앙고백서" };
export default function BelgicPage() { return <PageFrame title="벨직 신앙고백서" kicker="BELGIC CONFESSION" description="항별로 읽습니다."><PageContent><p className="confession-intro">{data.intro}</p><BelgicList articles={data.articles}/></PageContent></PageFrame>; }
