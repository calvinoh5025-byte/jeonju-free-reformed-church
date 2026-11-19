import type { Metadata } from "next";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import FreeBoardClient from "./free-board-client";

export const metadata: Metadata = {
  title: "자유게시판",
  description: "이웃과 이야기를 나누는 자유게시판입니다. 작성한 글은 바로 공개됩니다.",
};

export default function FreeBoardPage() {
  return <main id="main" tabIndex={-1} className="sub-page compact-page board-page">
    <SiteHeader />
    <SubHero kicker="COMMUNITY" title="자유게시판" description="교회와 이웃이 따뜻한 소식과 이야기를 나누는 공간입니다. 작성한 글은 바로 공개됩니다." />
    <section className="content-section compact-board"><FreeBoardClient /></section>
    <SiteFooter />
  </main>;
}
