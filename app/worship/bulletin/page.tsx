import type { Metadata } from "next";
import { SiteFooter, SiteHeader, SubHero } from "../../components/site-shell";
import { BulletinBoard } from "../bulletin-board";

export const metadata: Metadata = { title: "주보" };

export default function BulletinPage() {
  return <main id="main" tabIndex={-1} className="sub-page bulletin-page">
    <SiteHeader />
    <SubHero kicker="BULLETIN" title="주보" description="이번 주 예배 주보와 지난 주보를 확인할 수 있습니다." />
    <BulletinBoard />
    <SiteFooter />
  </main>;
}
