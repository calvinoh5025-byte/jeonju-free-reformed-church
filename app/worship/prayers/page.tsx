import type { Metadata } from "next";
import data from "../data/prayers.json";
import { DocFrame } from "../doc-frame";
import { DocBlocks, type Block } from "../doc-blocks";
export const metadata: Metadata = { title: "개혁교회 기도문" };
export default function PrayersPage() {
  const blocks = data.blocks as Block[];
  const titles = blocks.filter(block => block.type === "h3");
  return <DocFrame kicker="PRAYERS" title="개혁교회 기도문">
    <nav className="doc-toc" aria-label="기도문 목차"><strong>목차</strong><ol>{titles.map(title => { const n = title.text.match(/^(\d+)\./)?.[1]; return <li key={title.text}><a href={`#p${n}`}>{title.text.replace(/^\d+\.\s*/, "")}</a></li>; })}</ol></nav>
    <DocBlocks blocks={blocks} />
  </DocFrame>;
}
