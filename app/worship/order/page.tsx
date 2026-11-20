import type { Metadata } from "next";
import Link from "next/link";
import data from "../data/worship-order.json";
import { DocFrame } from "../doc-frame";
import { WorshipOrderSelector } from "../document-selectors";
export const metadata: Metadata = { title: "예배순서" };
export default function OrderPage() {
  return <DocFrame kicker="ORDER OF WORSHIP" title="예배순서">
    <WorshipOrderSelector forms={data.forms} />
    <Link className="order-bulletin-cta" href="/worship/bulletin">이번 주 주보 보기</Link>
  </DocFrame>;
}
