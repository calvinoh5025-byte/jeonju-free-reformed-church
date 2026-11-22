import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { DesktopMenu } from "./desktop-menu";
import { FooterNavigation } from "./footer-navigation";
import { InstallApp } from "./install-app";
import styles from "./site-shell.module.css";
import { address, contact } from "../church-info";

const footerContact = { phone: "010-4163-0290", phoneHref: "tel:01041630290", email: "minimini250@hanmail.net" };
const footerYoutube = "https://www.youtube.com/channel/UCF7kK_6xtj2aFUm3V0P91gA";

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

export function SiteFooter({ showNavigation = false, includeMenuLink = true }: { showNavigation?: boolean; includeMenuLink?: boolean }) {
  return (
    <footer>
      <Link className="brand footer-brand" href="/"><span className="brand-mark">FRCK</span><span>자유개혁교회</span></Link>
      <p>말씀과 신앙고백 위에 세워지는 언약 공동체</p>
      <p>전주자유개혁교회 · {address}</p>
      <div className="footer-install"><InstallApp /></div>
      {showNavigation && <FooterNavigation includeMenuLink={includeMenuLink} />}
      <div><a href={footerYoutube} target="_blank" rel="noreferrer">YouTube</a><a href={contact.facebook} target="_blank" rel="noreferrer">Facebook</a><a href={footerContact.phoneHref}>{footerContact.phone}</a><a href={`mailto:${footerContact.email}`}>{footerContact.email}</a></div>
      <small>© 2026 Free Reformed Churches in Korea</small>
    </footer>
  );
}

export function SubHero({ kicker, title, description, illustration }: { kicker: string; title: string; description: string; illustration?: string }) {
  return <section className="sub-hero"><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{description}</p>{illustration && <span className="sub-hero-illustration" aria-hidden="true" style={{ backgroundImage: `url('${illustration}')` }} />}</section>;
}
