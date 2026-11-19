import type { Metadata } from "next";
import data from "../data/subscription.json";
import { DocFrame } from "../doc-frame";
import type { Block } from "../doc-blocks";
import { SubscriptionSelector } from "../document-selectors";
export const metadata: Metadata = { title: "동의서약서" };
export default function SubscriptionPage() {
  const blocks = data.blocks as Block[];
  const starts = blocks.map((block, index) => block.type === "h2" ? index : -1).filter(index => index >= 0);
  const sections = starts.map((start, index) => ({
    label: index === 0 ? "지교회용" : "노회용",
    blocks: blocks.slice(start, starts[index + 1] ?? blocks.length),
  }));
  return <DocFrame kicker="FORM OF SUBSCRIPTION" title="동의서약서"><SubscriptionSelector sections={sections} /></DocFrame>;
}
