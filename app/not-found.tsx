import { SiteFooter, SiteHeader } from "./components/site-shell";
export default function NotFound() { return <main id="main" className="sub-page"><SiteHeader /><section className="reader-missing"><p className="section-kicker">404</p><h1>페이지를 찾을 수 없습니다.</h1><p><a href="/">홈으로</a> · <a href="/resources">자료실로</a></p></section><SiteFooter /></main>; }
