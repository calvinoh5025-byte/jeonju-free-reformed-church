import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader, SubHero } from "../../../components/site-shell";
import data from "../../data/hymns.json";
import { WorshipReader } from "../../worship-reader";

export const generateStaticParams = () => data.map(item => ({ n: String(item.n) }));
export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> { const { n } = await params; return { title: `찬송 ${n}장` }; }
export default async function HymnPage({ params }: { params: Promise<{ n: string }> }) { const { n } = await params; const item = data.find(entry => entry.n === Number(n)); if (!item) notFound(); return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="HYMNS" title={`찬송 ${item.n}장${item.title ? ` ${item.title}` : ""}`} description="" /><article className="worship-reader"><WorshipReader item={item} kind="hymns" maximum={data.length} /></article><SiteFooter /></main>; }
