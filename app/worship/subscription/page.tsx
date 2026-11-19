import type { Metadata } from "next";
import data from "../data/subscription.json";
import { DocFrame } from "../doc-frame";
import { DocBlocks, type Block } from "../doc-blocks";
export const metadata: Metadata = { title: "동의서약서" };
export default function SubscriptionPage() { return <DocFrame kicker="FORM OF SUBSCRIPTION" title="동의서약서"><DocBlocks blocks={data.blocks as Block[]} /></DocFrame>; }
