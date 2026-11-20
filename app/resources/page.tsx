import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { LearningResources } from "../components/learning-resources";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "자료실", description: "개혁교회 설교 자료와 클라리온 잡지를 한국어로 읽을 수 있습니다." };

export default function ResourcesPage() {
  return <main id="main" tabIndex={-1} className="sub-page resources-page"><SiteHeader /><SubHero kicker="RESOURCES" title="신앙과 예배를 위한 자료실" description="개혁교회 설교 자료와 클라리온 잡지를 한국어로 읽을 수 있습니다." illustration="/illustrations/open-bible.svg" />
    <LearningResources />
    <section className="content-section share-card-section" aria-labelledby="share-card-title">
      <article className="resource-card share-card">
        <div className="file-badge">SHARE</div>
        <div><h3 id="share-card-title">성도 자료 나눔</h3><p>설교 요약, 묵상, 주일학교 교재 같은 자료를 누구나 올리고 내려받을 수 있습니다.</p></div>
        <div className="resource-actions"><Link className="button primary" href="/resources/share">자료 나누기 →</Link></div>
      </article>
    </section>
    <SiteFooter /></main>;
}
