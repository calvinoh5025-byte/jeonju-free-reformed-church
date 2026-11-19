import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { ReadingControls } from "../confessions/reading-controls";
export function DocFrame({ kicker, title, description = "", children }: { kicker: string; title: string; description?: string; children: ReactNode }) {
  return <main id="main" tabIndex={-1} className="sub-page confession-page"><SiteHeader /><SubHero kicker={kicker} title={title} description={description} />
    <section className="content-section confession-content"><nav className="doc-crumb" aria-label="위치"><Link href="/worship">← 예배생활</Link></nav><ReadingControls /><div className="confession-reading doc-reading">{children}</div></section><SiteFooter /></main>;
}
