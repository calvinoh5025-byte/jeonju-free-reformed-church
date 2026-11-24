import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "교회소개", description: "말씀과 신앙고백 위에 서서 언약 안에서 함께 자라가는 개혁교회입니다." };

export default function AboutPage() {
  return <main id="main" tabIndex={-1} className="sub-page compact-page about-page">
    <SiteHeader />
    <SubHero kicker="ABOUT OUR CHURCH" title="그리스도께 속한 교회, 자유개혁교회" description="말씀과 신앙고백 위에 서서 언약 안에서 함께 자라가는 개혁교회입니다." />
    <section className="content-section compact-about" aria-labelledby="about-summary-title">
      <div className="about-summary-heading"><p className="section-kicker">WHO WE ARE</p><h2 id="about-summary-title">우리가 믿고 고백하는 것</h2></div>
      <div className="about-summary">
        <article><span>01</span><h3><a href="/worship/bible" aria-label="성경 중심 — 성경읽기 보기">성경 중심</a></h3><p>성경을 신앙과 삶의 유일하고 충분한 규범으로 받습니다.</p></article>
        <article><span>02</span><h3><a href="/church" aria-label="개혁교회 신앙 — 개혁교회 신앙고백서 보기">개혁교회 신앙</a></h3><p>역사적 개혁교회의 신앙고백을 함께 고백합니다.</p></article>
        <article><span>03</span><h3><a href="/worship" aria-label="언약 공동체 — 예배 보기">언약 공동체</a></h3><p>가정·학교·교회가 함께 다음 세대에 믿음을 전합니다.</p></article>
      </div>
      <div className="compact-roots" aria-labelledby="roots-title">
        <div><p className="section-kicker light">OUR ROOTS</p><h2 id="roots-title">우리의 뿌리</h2><p>그리스도께서 사도시대부터 모으신 보편교회와 종교개혁을 통해 회복된 성경의 권위와 은혜의 복음을 이어갑니다.</p></div>
        <ol>
          <li><time>사도시대</time><strong>그리스도께서 모으시는 교회</strong></li>
          <li><time>16세기</time><strong>종교개혁</strong></li>
          <li><time>1561–1619</time><strong>세 일치 신조</strong></li>
          <li><time>1944</time><strong>자유와 복귀 선언</strong></li>
        </ol>
        <a className="text-link" href="/church">개혁교회 신앙고백서 보기 →</a>
      </div>
      <div className="church-signature" aria-label="교회 로고">
        <img src="/images/church-logo-transparent.png" alt="자유 교회 로고" />
      </div>
    </section>
    <SiteFooter />
  </main>;
}
