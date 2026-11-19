import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import psalms from "./data/psalms.json";
import hymns from "./data/hymns.json";

export const metadata: Metadata = { title: "예배생활" };
const cards = [
  { title: "시편찬송 부르기", href: "/worship/psalms", detail: `시편 ${psalms.length}편 · 찬송 ${hymns.length}장` },
  { title: "개혁교회 기도문", href: "/resources/read/prayers" },
  { title: "예배순서", href: "/resources/read/worship-order" },
  { title: "예전예식서", href: "/resources/read/liturgical-forms" },
];

export default function WorshipPage() {
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="WORSHIP" title="예배생활" description="" /><section className="worship-grid" aria-label="예배생활 자료">
    {cards.map(card => <Link className="worship-card" href={card.href} key={card.href}><strong>{card.title}</strong>{card.detail && <span>{card.detail}</span>}<span aria-hidden="true">열기 →</span></Link>)}
    <Link className="worship-card" href="/resources/read/subscription"><strong>동의서약서</strong><span aria-hidden="true">열기 →</span></Link>
  </section><SiteFooter /></main>;
}
