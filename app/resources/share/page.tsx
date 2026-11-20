import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../../components/site-shell";
import { ShareBoard } from "../share-board";

export const metadata: Metadata = { title: "성도 자료 나눔", description: "설교 요약, 묵상, 주일학교 교재 같은 자료를 성도들이 함께 나눕니다." };

export default function SharePage() {
  return <main id="main" tabIndex={-1} className="sub-page resources-page"><SiteHeader />
    <SubHero kicker="SHARE" title="성도 자료 나눔" description="설교 요약, 묵상, 주일학교 교재 같은 자료를 함께 나눕니다." />
    <section className="content-section share-wrap">
      <nav className="doc-crumb" aria-label="위치"><Link href="/resources">← 자료실</Link></nav>
      <ShareBoard />
    </section>
    <SiteFooter /></main>;
}
