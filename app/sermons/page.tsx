import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";

const channel = "https://www.youtube.com/channel/UCF7kK_6xtj2aFUm3V0P91gA";
export default function SermonsPage() {
  return <main className="sub-page compact-page sermons-page"><SiteHeader /><SubHero kicker="SERMONS" title="선포된 말씀을 다시 듣습니다" description="주일 오전·오후예배 설교를 공식 유튜브 채널에서 확인할 수 있습니다." />
    <section className="content-section sermon-board compact-sermons"><div className="featured-sermon"><span className="play">▶</span><div><p className="section-kicker">OFFICIAL YOUTUBE</p><h2>자유개혁교회</h2><p>최근 설교와 지난 예배 영상을 한곳에서 들으세요.</p></div><a className="button primary" href={channel} target="_blank" rel="noreferrer">설교 채널 열기 ↗</a></div>
    </section><SiteFooter /></main>;
}
