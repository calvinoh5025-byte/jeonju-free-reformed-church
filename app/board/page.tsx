import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import BoardClient from "./board-client";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "공지게시판", description: "교회 공지사항을 확인할 수 있습니다." };
export default function BoardPage() { return <main id="main" tabIndex={-1} className="sub-page compact-page board-page"><SiteHeader /><SubHero kicker="NOTICE BOARD" title="공지게시판" description="교회 공지사항을 확인할 수 있습니다." /><section className="content-section compact-board"><BoardClient /></section><SiteFooter /></main>; }
