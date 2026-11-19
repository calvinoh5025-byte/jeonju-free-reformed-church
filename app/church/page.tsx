import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "개혁교회 신앙고백서", description: "자유개혁교회는 성경을 유일하고 충분한 신앙의 규범으로 받으며, 보편 신경과 세 일치 신조를 함께 고백합니다." };

const confessions = [
  { year: "초대교회", title: "보편 신경", href: "/confessions/universal-creeds", text: "사도신경, 니케아 신경, 아타나시우스 신경을 통해 삼위 하나님과 그리스도에 관한 보편 교회의 믿음을 고백합니다." },
  { year: "1561", title: "벨직 신앙고백서", href: "/confessions/belgic", text: "하나님과 성경, 창조와 구원, 교회와 성례, 마지막 날에 관한 개혁교회의 믿음을 37개 조항으로 고백합니다." },
  { year: "1563", title: "하이델베르크 교리문답", href: "/confessions/heidelberg", text: "죄와 비참, 구원, 감사라는 구조 안에서 그리스도인의 유일한 위로를 52주일 문답으로 가르칩니다." },
  { year: "1618-1619", title: "돌트 신경", href: "/confessions/dort", text: "하나님의 주권적 은혜, 그리스도의 구속, 효과적인 부르심과 성도의 견인을 분명하게 고백합니다." },
];

export default function ChurchPage() {
  return <main id="main" tabIndex={-1} className="sub-page confessions-page"><SiteHeader /><SubHero kicker="OUR CONFESSION" title="우리가 함께 고백하는 믿음" description="자유개혁교회는 성경을 유일하고 충분한 신앙의 규범으로 받으며, 보편 신경과 세 일치 신조를 함께 고백합니다." illustration="/illustrations/olive-branch.svg" />
    <section className="content-section confession-page compact-confessions">
      <div className="confession-cards">{confessions.map(c => <article key={c.title}><a className="confession-card-link" href={c.href}><span>{c.year}</span><h3>{c.title}</h3><p>{c.text}</p><strong className="confession-card-read">읽기 →</strong></a></article>)}</div>
    </section>
    <SiteFooter /></main>;
}
