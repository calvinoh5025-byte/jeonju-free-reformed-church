import type { Metadata } from "next";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { VisitCalendar } from "./visit-calendar";

export const metadata: Metadata = { title: "심방 일정" };

export default function VisitsPage() {
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="VISIT SCHEDULE" title="심방 일정" description="예정된 장로 심방 일정을 확인하실 수 있습니다." /><VisitCalendar /><p style={{ textAlign: "center", margin: "0 0 48px", fontSize: 14 }}><a href="/visits/manage" style={{ color: "#6a706b" }}>직분자 로그인</a></p><SiteFooter /></main>;
}
