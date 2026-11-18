import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import BoardClient from "./board-client";
export default function BoardPage() { return <main className="sub-page compact-page board-page"><SiteHeader /><SubHero kicker="COMMUNITY" title="자유게시판" description="교회와 이웃이 따뜻한 소식과 이야기를 나누는 공간입니다. 작성한 글은 관리자 확인 후 공개됩니다." /><section className="content-section compact-board"><BoardClient /></section><SiteFooter /></main>; }
