import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { LearningResources } from "../components/learning-resources";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "자료실", description: "개혁교회 설교 자료와 클라리온 잡지를 한국어로 읽을 수 있습니다." };

export default function ResourcesPage() {
  return <main id="main" tabIndex={-1} className="sub-page resources-page"><SiteHeader /><SubHero kicker="RESOURCES" title="신앙과 예배를 위한 자료실" description="개혁교회 설교 자료와 클라리온 잡지를 한국어로 읽을 수 있습니다." illustration="/illustrations/open-bible.svg" />
    <LearningResources />
    <SiteFooter /></main>;
}
