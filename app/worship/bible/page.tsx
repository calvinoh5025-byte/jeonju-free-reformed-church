import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SubHero } from "../../components/site-shell";
import books from "../data/bible-books.json";

export const metadata: Metadata = { title: "성경읽기" };

const groups = [
  { id: "ot", label: "구약 39권" },
  { id: "nt", label: "신약 27권" },
];

export default function BiblePage() {
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="BIBLE" title="성경읽기" description="개역한글판 성경을 책과 장을 골라 읽을 수 있습니다." />
    <section className="bible-index">
      {groups.map(group => <section className="bible-group" key={group.id}>
        <h2>{group.label}</h2>
        <div className="bible-book-grid">
          {books.filter(book => book.testament === group.id).map(book => <Link href={`/worship/bible/${book.slug}`} key={book.slug}><strong>{book.ko}</strong><small>{book.chapters}장</small></Link>)}
        </div>
      </section>)}
      <p className="bible-credit">성경전서 개역한글판 · 대한성서공회</p>
    </section>
    <SiteFooter /></main>;
}
