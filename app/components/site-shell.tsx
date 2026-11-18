import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import styles from "./site-shell.module.css";
import { address, contact } from "../church-info";

const nav = [
  ["교회소개", "/about"],
  ["우리의 신앙고백", "/church"],
  ["설교", "/sermons"],
  ["자유게시판", "/board"],
  ["자료실", "/resources"],
  ["오시는 길", "/location"],
];

export function SiteHeader() {
  return (
    <header className={`sub-header ${styles.header}`}>
      <Link className="brand" href="/" aria-label="자유개혁교회 홈">
        <span className="brand-mark">FRCK</span><span>자유개혁교회</span>
      </Link>
      <nav className="desktop-nav" aria-label="주요 메뉴">
        {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <MobileMenu />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <Link className="brand footer-brand" href="/"><span className="brand-mark">FRCK</span><span>자유개혁교회</span></Link>
      <p>말씀과 신앙고백 위에 세워지는 언약 공동체</p>
      <p>전주자유개혁교회 · {address}</p>
      <div><a href="/sermons">설교</a><a href="/resources">자료실</a><a href={contact.phoneHref}>{contact.phone}</a><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
      <small>© 2026 Free Reformed Church in Korea</small>
    </footer>
  );
}

export function SubHero({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return <section className="sub-hero"><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{description}</p></section>;
}
