import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader, SubHero } from "../../../components/site-shell";
import data from "../../data/psalms.json";
import { WorshipReader } from "../../worship-reader";

export const generateStaticParams = () => data.map(item => ({ n: String(item.n) }));
export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> { const { n } = await params; return { title: `시편 ${n}편` }; }
export default async function PsalmPage({ params }: { params: Promise<{ n: string }> }) { const { n } = await params; const item = data.find(entry => entry.n === Number(n)); if (!item) notFound(); return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="PSALTER" title={`시편 ${item.n}편`} description="" /><article className="worship-reader"><WorshipReader item={item} kind="psalms" maximum={data.length} /></article><SiteFooter /></main>; }
