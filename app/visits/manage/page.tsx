import type { Metadata } from "next";
import { SiteFooter, SiteHeader, SubHero } from "../../components/site-shell";
import { ManageClient } from "./manage-client";

export const metadata: Metadata = { title: "심방 일정 관리", robots: { index: false, follow: false } };

export default function VisitManagePage() {
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="STAFF ONLY" title="심방 일정 관리" description="장로·집사님이 로그인해서 심방 일정을 입력합니다." /><ManageClient /><SiteFooter /></main>;
}
