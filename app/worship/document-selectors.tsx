"use client";

import { useState } from "react";
import type { Block } from "./doc-blocks";

type PrayerSection = { title: string; blocks: Block[] };
type OrderForm = {
  name: string;
  services: { name: string; items: { n: number; optional: boolean; sub: string[]; text: string }[] }[];
};
type SubscriptionSection = { label: string; blocks: Block[] };

function SelectedDocument({ blocks }: { blocks: Block[] }) {
  return <div className="doc-blocks">{blocks.map((block, index) => {
    if (block.type === "h2") return <h2 key={index}>{block.text}</h2>;
    if (block.type === "h3") return <h3 key={index}>{block.text}</h3>;
    if (block.type === "h4") return <h4 key={index}>{block.text}</h4>;
    if (block.type === "note") return <p className="doc-note" key={index}>{block.text}</p>;
    return <p key={index}>{block.text}</p>;
  })}</div>;
}

export function PrayerSelector({ sections }: { sections: PrayerSection[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (selected === null) return <nav className="doc-toc" aria-label="기도문 목차">
    <strong>목차</strong>
    <ol>{sections.map((section, index) => <li key={section.title}><button className="document-choice-button" type="button" onClick={() => setSelected(index)}>{section.title.replace(/^\d+\.\s*/, "")}</button></li>)}</ol>
  </nav>;
  const section = sections[selected];
  return <>
    <button className="document-back-button" type="button" onClick={() => setSelected(null)}>← 기도문 목차</button>
    <SelectedDocument blocks={section.blocks} />
    <nav className="document-item-navigation" aria-label="기도문 이동">
      <button type="button" disabled={selected === 0} onClick={() => setSelected(selected - 1)}>← 이전 기도문</button>
      <span>{selected + 1} / {sections.length}</span>
      <button type="button" disabled={selected === sections.length - 1} onClick={() => setSelected(selected + 1)}>다음 기도문 →</button>
    </nav>
  </>;
}

export function WorshipOrderSelector({ forms }: { forms: OrderForm[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (selected === null) return <nav className="doc-toc doc-toc-inline" aria-label="예배순서 형식">
    {forms.map((form, index) => <button className="document-choice-button" key={form.name} type="button" onClick={() => setSelected(index)}>{form.name}</button>)}
  </nav>;
  const form = forms[selected];
  return <>
    <button className="document-back-button" type="button" onClick={() => setSelected(null)}>← A형·B형 선택</button>
    <section className="order-form"><h2>{form.name}</h2><div className="order-services">{form.services.map(service => <div className="order-service" key={service.name}><h3>{service.name}</h3><ol>{service.items.map(item => <li key={item.n} className={item.optional ? "order-optional" : undefined}>{item.text}{item.sub.length > 0 && <ul>{item.sub.map(sub => <li key={sub}>{sub}</li>)}</ul>}</li>)}</ol></div>)}</div></section>
  </>;
}

export function SubscriptionSelector({ sections }: { sections: SubscriptionSection[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (selected === null) return <nav className="doc-toc doc-toc-inline" aria-label="동의서약서 선택">
    {sections.map((section, index) => <button className="document-choice-button" key={section.label} type="button" onClick={() => setSelected(index)}>{section.label}</button>)}
  </nav>;
  return <>
    <button className="document-back-button" type="button" onClick={() => setSelected(null)}>← 지교회용·노회용 선택</button>
    <SelectedDocument blocks={sections[selected].blocks} />
  </>;
}
