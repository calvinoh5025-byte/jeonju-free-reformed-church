import type { Metadata } from "next";
import Link from "next/link";
import data from "../data/liturgical-forms.json";
import { DocFrame } from "../doc-frame";
export const metadata: Metadata = { title: "예전예식서" };
export default function LiturgyIndex() {
  const forms = data.blocks.filter(block => block.type === "h2");
  return <DocFrame kicker="LITURGICAL FORMS" title="예전예식서"><div className="confession-list belgic-list">{forms.map((form, index) => <Link className="confession-list-card" key={form.text} href={`/worship/liturgy/${index + 1}`}><strong>{index + 1}</strong><span>{form.text}</span><span>읽기 →</span></Link>)}</div></DocFrame>;
}
