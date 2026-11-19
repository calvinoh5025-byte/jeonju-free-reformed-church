import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import data from "../../data/liturgical-forms.json";
import { DocFrame } from "../../doc-frame";
import { DocBlocks, type Block } from "../../doc-blocks";
const all = data.blocks as Block[];
const starts = all.map((block, index) => block.type === "h2" ? index : -1).filter(index => index >= 0);
const sections = starts.map((start, i) => all.slice(start, starts[i + 1] ?? all.length));
export const generateStaticParams = () => sections.map((_, index) => ({ n: String(index + 1) }));
export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> { const { n } = await params; return { title: sections[Number(n) - 1]?.[0].text ?? "예전예식서" }; }
export default async function LiturgyPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params; const index = Number(n) - 1; const section = sections[index]; if (!section) notFound();
  const [head, ...rest] = section;
  return <DocFrame kicker="LITURGICAL FORMS" title={head.text}><DocBlocks blocks={rest} notes={head.notes} />
    <nav className="confession-navigation" aria-label="예식서 이동">{index > 0 ? <Link href={`/worship/liturgy/${index}`}>← {sections[index - 1][0].text}</Link> : <span />}<Link href="/worship/liturgy">목록</Link>{index < sections.length - 1 ? <Link href={`/worship/liturgy/${index + 2}`}>{sections[index + 1][0].text} →</Link> : <span />}</nav>
  </DocFrame>;
}
