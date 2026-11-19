import type { Metadata } from "next";
import data from "../data/prayers.json";
import { DocFrame } from "../doc-frame";
import type { Block } from "../doc-blocks";
import { PrayerSelector } from "../document-selectors";
export const metadata: Metadata = { title: "개혁교회 기도문" };
export default function PrayersPage() {
  const blocks = data.blocks as Block[];
  const starts = blocks.map((block, index) => block.type === "h3" ? index : -1).filter(index => index >= 0);
  const sections = starts.map((start, index) => ({ title: blocks[start].text, blocks: blocks.slice(start, starts[index + 1] ?? blocks.length) }));
  return <DocFrame kicker="PRAYERS" title="개혁교회 기도문">
    <PrayerSelector sections={sections} />
  </DocFrame>;
}
