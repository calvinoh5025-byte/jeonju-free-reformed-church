import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { LearningResources } from "../components/learning-resources";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "자료실", description: "교회가 함께 읽고 고백하며 찬송하는 데 필요한 자료를 제공합니다." };

const resources = [
  { title: "시편송", detail: "시편 1편부터 150편까지", pages: "302쪽", href: "/resources/read/psalms" },
  { title: "찬송", detail: "찬송 1장부터 85장까지", pages: "136쪽", href: "/resources/read/hymns" },
  { title: "보편 신경", detail: "사도신경·니케아 신경·아타나시우스 신경", pages: "4쪽", href: "/resources/read/universal-creeds" },
  { title: "벨직 신앙고백서", detail: "개혁교회의 첫 번째 교리 표준 문서", pages: "18쪽", href: "/resources/read/belgic" },
  { title: "하이델베르크 교리문답", detail: "52주일로 구성된 교리문답", pages: "48쪽", href: "/resources/read/heidelberg" },
  { title: "돌트 신경", detail: "항론파에 반대하는 다섯 조항", pages: "28쪽", href: "/resources/read/dort" },
  { title: "기도문", detail: "개혁교회의 공예배 기도문", pages: "12쪽", href: "/resources/read/prayers" },
  { title: "교회질서", detail: "자유개혁 교회질서", pages: "13쪽", href: "/resources/read/church-order" },
  { title: "동의 서약서", detail: "직분자와 교회 회의를 위한 서약서", pages: "2쪽", href: "/resources/read/subscription" },
  { title: "예전예식서", detail: "교회의 예전과 예식 안내", pages: "42쪽", href: "/resources/read/liturgical-forms" },
  { title: "세 일치 신조 대조표", detail: "세 신조의 항목별 대조표", pages: "3쪽", href: "/resources/read/three-forms-comparison" },
  { title: "예배순서", detail: "오전·오후 공예배 순서", pages: "2쪽", href: "/resources/read/worship-order" },
];

export default function ResourcesPage() {
  return <main id="main" tabIndex={-1} className="sub-page resources-page"><SiteHeader /><SubHero kicker="RESOURCES" title="신앙과 예배를 위한 자료실" description="교회가 함께 읽고 고백하며 찬송하는 데 필요한 자료를 제공합니다." />
    <LearningResources />
    <section className="content-section resource-grid compact-resources">
      {resources.map(resource => <article className="resource-card" key={resource.title}><div className="file-badge">READ</div><div><p className="section-kicker">BOOK OF PRAISE IN KOREAN</p><h2>{resource.title}</h2><p>{resource.detail}</p><small>{resource.pages} · 홈페이지 바로보기</small></div><div className="resource-actions"><a className="button primary" href={resource.href}>원문 보기 →</a></div></article>)}
    </section><SiteFooter /></main>;
}
