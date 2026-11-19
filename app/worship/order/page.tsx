import type { Metadata } from "next";
import data from "../data/worship-order.json";
import { DocFrame } from "../doc-frame";
export const metadata: Metadata = { title: "예배순서" };
export default function OrderPage() {
  return <DocFrame kicker="ORDER OF WORSHIP" title="예배순서" description="괄호 안 항목은 해당되는 주일에만 진행합니다.">
    <nav className="doc-toc doc-toc-inline" aria-label="예배순서 형식">{data.forms.map(form => <a key={form.name} href={`#form-${form.name}`}>{form.name}</a>)}</nav>
    {data.forms.map(form => <section key={form.name} id={`form-${form.name}`} className="order-form"><h2>{form.name}</h2><div className="order-services">{form.services.map(service => <div className="order-service" key={service.name}><h3>{service.name}</h3><ol>{service.items.map(item => <li key={item.n} className={item.optional ? "order-optional" : undefined}>{item.text}{item.sub.length > 0 && <ul>{item.sub.map(sub => <li key={sub}>{sub}</li>)}</ul>}</li>)}</ol></div>)}</div></section>)}
  </DocFrame>;
}
