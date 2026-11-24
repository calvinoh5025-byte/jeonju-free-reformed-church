import type { Metadata } from "next";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { VisitCalendar } from "./visit-calendar";
import { PushNotify } from "./push-notify";
import "./login-button.css";

export const metadata: Metadata = { title: "심방 일정" };

export default function VisitsPage() {
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="VISIT SCHEDULE" title="심방 일정" description="예정된 장로 심방 일정을 확인하실 수 있습니다." /><VisitCalendar /><PushNotify /><p style={{ textAlign: "center", margin: "8px 16px 56px" }}><a href="/visits/manage" className="visit-login-button">직분자 로그인 <span aria-hidden="true">→</span></a></p><SiteFooter /></main>;
}

