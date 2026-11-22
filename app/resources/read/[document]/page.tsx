import { SiteFooter, SiteHeader } from "../../../components/site-shell";
import { PdfViewer } from "./pdf-viewer";
import { ChurchOrderText } from "./church-order-text";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const documents: Record<string, { title: string; file: string }> = {
  psalms: { title: "시편송", file: "/resources/psalms-section.pdf" },
  hymns: { title: "찬송", file: "/resources/hymns-section.pdf" },
  "universal-creeds": { title: "보편 신경", file: "/resources/universal-creeds-section.pdf" },
  belgic: { title: "벨직 신앙고백서", file: "/resources/belgic-section.pdf" },
  heidelberg: { title: "하이델베르크 교리문답", file: "/resources/heidelberg-section.pdf" },
  dort: { title: "돌트 신경", file: "/resources/dort-section.pdf" },
  prayers: { title: "기도문", file: "/resources/prayers.pdf" },
  "church-order": { title: "교회질서", file: "/resources/church-order.pdf" },
  subscription: { title: "동의 서약서", file: "/resources/subscription-form.pdf" },
  "liturgical-forms": { title: "예전예식서", file: "/resources/liturgical-forms.pdf" },
  "three-forms-comparison": { title: "세 일치 신조 대조표", file: "/resources/three-forms-comparison.pdf" },
  "worship-order": { title: "예배순서", file: "/resources/worship-order.pdf" },
};

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const { document } = await params;
  return documents[document] ? { title: documents[document].title } : {};
}

export default async function ReadDocumentPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  const item = documents[document];
  if (!item) notFound();
  const isChurchOrder = document === "church-order";
  return <main id="main" tabIndex={-1} className="sub-page"><SiteHeader />
    <header className="reader-head"><p className="section-kicker">READ ONLINE</p><h1>{item.title}</h1><p>별도 다운로드 없이 홈페이지에서 바로 읽을 수 있습니다.</p><a href="/resources">← 자료실로 돌아가기</a></header>
    {isChurchOrder ? <ChurchOrderText /> : <PdfViewer file={item.file} title={item.title} />}
    <SiteFooter />
  </main>;
}
