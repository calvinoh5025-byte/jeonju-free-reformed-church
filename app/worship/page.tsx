import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import psalms from "./data/psalms.json";
import hymns from "./data/hymns.json";

export const metadata: Metadata = { title: "예배" };
const cards = [
  { title: "성경읽기", href: "/worship/bible", detail: "개역한글판 · 구약 39권 · 신약 27권" },
  { title: "시편찬송 부르기", href: "/worship/psalms", detail: `시편 ${psalms.length}편 · 찬송 ${hymns.length}장` },
  { title: "개혁교회 기도문", href: "/worship/prayers" },
  { title: "예배순서", href: "/worship/order" },
  { title: "예전예식서", href: "/worship/liturgy" },
];

export default function WorshipPage() {
  return <main id="main" tabIndex={-1} className="sub-page worship-page"><SiteHeader /><SubHero kicker="WORSHIP" title="예배" description="" illustration="/illustrations/psalm-notes.svg" /><section className="worship-grid" aria-label="예배 자료">
    {cards.map(card => <Link className="worship-card" href={card.href} key={card.href}><strong>{card.title}</strong>{card.detail && <span>{card.detail}</span>}</Link>)}
    <Link className="worship-card" href="/worship/subscription"><strong>동의서약서</strong></Link>
  </section><SiteFooter /></main>;
}
