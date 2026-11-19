import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
export function PageFrame({ title, kicker = "CONFESSIONS", description, children }: { title: string; kicker?: string; description: string; children: ReactNode }) { return <main id="main" tabIndex={-1} className="sub-page confession-page"><SiteHeader/><SubHero kicker={kicker} title={title} description={description}/>{children}<SiteFooter/></main>; }
export function PageContent({ children }: { children: ReactNode }) { return <section className="content-section confession-content">{children}</section>; }
export function BackLink({ href, children }: { href: string; children: ReactNode }) { return <Link className="confession-back" href={href}>← {children}</Link>; }
export function ItemNavigation({ previous, next, list, previousLabel, nextLabel }: { previous?: string; next?: string; list: string; previousLabel: string; nextLabel: string }) { return <nav className="confession-navigation" aria-label="문서 이동">{previous ? <Link href={previous}>← {previousLabel}</Link> : <span/>}<Link href={list}>목록</Link>{next ? <Link href={next}>{nextLabel} →</Link> : <span/>}</nav>; }
