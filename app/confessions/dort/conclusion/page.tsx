import type { Metadata } from "next";
import data from "../../data/dort.json";
import { ConfessionShell, LinesText } from "../../confession-view";
import { PageContent, PageFrame } from "../../page-frame";
export const metadata: Metadata = { title: data.conclusion.title };
export default function DortConclusionPage() { return <PageFrame title={data.conclusion.title} kicker="CANONS OF DORT" description="돌트 신경"><PageContent><ConfessionShell><LinesText lines={data.conclusion.paragraphs} notes={data.conclusion.notes}/><nav className="confession-navigation"><span/><a href="/confessions/dort">목록</a><a href="/confessions/dort/1">첫째 교리 →</a></nav></ConfessionShell></PageContent></PageFrame>; }
