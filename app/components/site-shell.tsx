import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { DesktopMenu } from "./desktop-menu";
import { FooterNavigation } from "./footer-navigation";
import styles from "./site-shell.module.css";
import { address, contact } from "../church-info";

export function SiteHeader() {
  return (
    <header className={`sub-header ${styles.header}`}>
      <Link className="brand" href="/" aria-label="자유개혁교회 홈">
        <span className="brand-mark">FRCK</span><span>자유개혁교회</span>
      </Link>
      <DesktopMenu />
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
      <FooterNavigation />
      <div><a href={contact.phoneHref}>{contact.phone}</a><a href={contact.phone2Href}>{contact.phone2}</a><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
      <small>© 2026 Free Reformed Church in Korea</small>
    </footer>
  );
}

export function SubHero({ kicker, title, description, illustration }: { kicker: string; title: string; description: string; illustration?: string }) {
  return <section className="sub-hero"><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{description}</p>{illustration && <span className="sub-hero-illustration" aria-hidden="true" style={{ backgroundImage: `url('${illustration}')` }} />}</section>;
}
