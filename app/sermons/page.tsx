import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "설교", description: "주일 오전·오후예배 설교를 공식 유튜브 채널에서 확인할 수 있습니다." };

const channel = "https://www.youtube.com/channel/UCF7kK_6xtj2aFUm3V0P91gA";
export default function SermonsPage() {
  return <main id="main" tabIndex={-1} className="sub-page compact-page sermons-page"><SiteHeader /><SubHero kicker="SERMONS" title="선포된 말씀을 다시 듣습니다" description="주일 오전·오후예배 설교를 공식 유튜브 채널에서 확인할 수 있습니다." />
    <section className="content-section sermon-board compact-sermons"><a className="featured-sermon" href={channel} target="_blank" rel="noreferrer" aria-label="자유개혁교회 유튜브 설교 채널 열기 (새 창)"><span className="play">▶</span><div><p className="section-kicker">OFFICIAL YOUTUBE</p><h2>자유개혁교회</h2><p>최근 설교와 지난 예배 영상을 한곳에서 들으세요.</p></div></a>
    <div className="external-resource-cards"><a href="/guide/index.html#sermons"><strong>개혁교회 영어 설교 자료실 (한국어 번역 지원)</strong><span>자유개혁교회 자료실에서 TheSeed 설교를 한국어로 번역해 읽을 수 있습니다.</span></a><a href="/guide/index.html#clarion"><strong>클라리온 잡지 (PDF 번역 읽기)</strong><span>자유개혁교회 자료실에서 Clarion 잡지 PDF를 한국어로 번역해 읽을 수 있습니다.</span></a></div></section><SiteFooter /></main>;
}
