import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader, SubHero } from "../../../components/site-shell";
import books from "../../data/bible-books.json";
import { BibleReader } from "../../bible-reader";
import { BibleSearch } from "../../bible-search";

export const generateStaticParams = () => books.map(book => ({ book: book.slug }));

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }): Promise<Metadata> {
  const { book } = await params;
  const meta = books.find(entry => entry.slug === book);
  return { title: meta ? `${meta.ko} (성경읽기)` : "성경읽기" };
}

export default async function BibleBookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const index = books.findIndex(entry => entry.slug === book);
  if (index < 0) notFound();
  const meta = books[index];
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader /><SubHero kicker="BIBLE" title={meta.ko} description={`개역한글판 · 전 ${meta.chapters}장`} />
    <article className="worship-reader bible-reader">
      <BibleSearch books={books} current={meta} />
      <BibleReader book={meta} previous={books[index - 1] ?? null} next={books[index + 1] ?? null} />
    </article>
    <SiteFooter /></main>;
}
