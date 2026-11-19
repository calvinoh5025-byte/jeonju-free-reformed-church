import type { Metadata } from "next";
import data from "../data/heidelberg.json";
import { HeidelbergList } from "../confession-view";
import { PageContent, PageFrame } from "../page-frame";
export const metadata: Metadata = { title: "하이델베르크 교리문답" };
export default function HeidelbergPage() { return <PageFrame title="하이델베르크 교리문답" kicker="HEIDELBERG CATECHISM" description="주일별 문답을 읽습니다."><PageContent><p className="confession-intro">{data.intro}</p><HeidelbergList days={data.lordsDays}/></PageContent></PageFrame>; }
