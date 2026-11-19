import type { Metadata } from "next";
import { SiteFooter, SiteHeader, SubHero } from "../../components/site-shell";
import { UniversalCreedsReader } from "./reader";

export const metadata: Metadata = { title: "보편 신경" };

export default function UniversalCreedsPage() {
  return <main id="main" tabIndex={-1} className="sub-page confession-page">
    <SiteHeader />
    <SubHero kicker="EARLY CHURCH CREEDS" title="보편 신경" description="사도신경, 니케아 신경, 아타나시우스 신경을 선택해 읽습니다." illustration="/illustrations/olive-branch.svg" />
    <section className="content-section confession-content">
      <UniversalCreedsReader />
    </section>
    <SiteFooter />
  </main>;
}
