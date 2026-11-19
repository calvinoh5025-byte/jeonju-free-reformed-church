import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../../components/site-shell";
import data from "../data/psalms.json";
import { WorshipIndex } from "../worship-index";

export const metadata: Metadata = { title: "시편찬송" };
export default function PsalmsPage() { return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="PSALTER" title="시편찬송" description="" /><nav className="worship-tabs" aria-label="시편 또는 찬송 선택"><Link aria-current="page" href="/worship/psalms">시편</Link><Link href="/worship/hymns">찬송</Link></nav><WorshipIndex kind="psalms" items={data} /><SiteFooter /></main>; }
