import "./home-contrast.css";
import Link from "next/link";
import styles from "./motto.module.css";
import { MobileMenu } from "./components/mobile-menu";
import { DesktopMenu } from "./components/desktop-menu";
import { SiteFooter } from "./components/site-shell";
import { MapPreview } from "./components/map-preview";
import { AddressCopy } from "./components/address-copy";
import { address, contact, postalCode, worshipTimes } from "./church-info";

const facebook = "https://www.facebook.com/DongSupSong/";
const naverMap = "https://map.naver.com/p/search/%EC%A0%84%EB%B6%81%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%98%EB%8F%84%20%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4";

export default function Home() {
  return (
    <main id="main" tabIndex={-1} className="home-page">
      <section className="hero" id="home">
        <header className="site-header">
          <a className="brand" href="#home" aria-label="자유개혁교회 홈">
            <span className="brand-mark">FRCK</span>
            <span>자유개혁교회</span>
          </a>
          <DesktopMenu />
          <MobileMenu />
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">FREE REFORMED CHURCH IN KOREA</p>
            <h1 className="home-hero-title"><span>말씀 위에 서는 교회,</span><span>언약 안에서 함께 걷는 공동체</span></h1>
            <div className="gold-rule" />
            <p className="lead">성경과 세 일치 신조를 따라 그리스도를 고백하며, 세대와 세대를 이어 신실한 교회를 세우시는 그리스도 안에서 살아갑니다.</p>
            <aside className="visitor-card"><strong>처음 오시는 분</strong>{worshipTimes.map(item => <p key={item.label}>{item.label} {item.time}</p>)}<p>{address}</p><p>문의 <a href={contact.phoneHref}>{contact.phone}</a> · <a href={contact.phone2Href}>{contact.phone2}</a> · <a href={`mailto:${contact.email}`}>{contact.email}</a></p><a className="button secondary" href="/newcomers">새가족 안내</a><a className="button secondary" href="/location">오시는 길</a><a className="button secondary" href="/worship/bulletin">예배순서 보기</a></aside>
          </div>
          <div className="hero-media">
            <div className="hero-image" role="img" aria-label="자유개혁교회 간판" />
            <a className="hero-facebook-link" href={facebook} target="_blank" rel="noreferrer">교회 페이스북 안내 <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section className="identity section" id="church">
        <div className="identity-intro">
          <p className="section-kicker light">OUR FOUNDATION</p>
          <h2>진리에 기초한<br />오늘의 신실한 고백</h2>
          <p className={styles.description}>시대의 흐름보다 성경의 권위에 귀 기울이며, 역사적 개혁교회의 신앙을 오늘의 삶 속에서 함께 고백합니다.</p>
          <div className={styles.motto}>
            <span>Bound but Free</span>
            <strong>하나님께 매인 자만이 참으로 자유롭다.</strong>
          </div>
        </div>
        <div className="pillars" id="confession">
          <article><span>01</span><h3><Link href="/worship/bible" aria-label="오직 성경 — 성경읽기 보기">오직 성경</Link></h3><p>성경을 신앙과 삶의 유일하고 충분한 규범으로 고백합니다.</p></article>
          <article><span>02</span><h3><a href="/church" aria-label="세 일치 신조 — 개혁교회 신앙고백서 보기">세 일치 신조</a></h3><p>벨직 신앙고백, 하이델베르크 교리문답, 돌트 신경을 받아 고백합니다.</p></article>
          <article><span>03</span><h3><a href="/worship" aria-label="언약 공동체 — 예배생활 보기">언약 공동체</a></h3><p>가정과 학교와 교회가 함께 다음 세대에 믿음을 전수하며 자라갑니다.</p></article>
        </div>
      </section>

      <section className="confessions section">
        <p className="section-kicker">THREE FORMS OF UNITY</p>
        <div className="section-heading"><h2>우리가 함께 고백하는 신앙</h2><p>우리는 교회가 성경을 따라 함께 고백해 온 믿음의 내용을 소중히 여깁니다.</p></div>
        <div className="confession-list">
          <article><Link href="/confessions/belgic" aria-label="벨직 신앙고백 인터랙티브 읽기"><span>1561</span><h3>벨직 신앙고백</h3><p>삼위 하나님과 구원, 교회와 성례에 관한 성경적 신앙을 체계적으로 고백합니다.</p></Link></article>
          <article><Link href="/confessions/heidelberg" aria-label="하이델베르크 교리문답 인터랙티브 읽기"><span>1563</span><h3>하이델베르크 교리문답</h3><p>죄와 비참, 구원, 감사의 구조로 그리스도인의 유일한 위로를 가르칩니다.</p></Link></article>
          <article><Link href="/confessions/dort" aria-label="돌트 신경 인터랙티브 읽기"><span>1619</span><h3>돌트 신경</h3><p>하나님의 주권적 은혜와 성도의 견인을 분명하게 증언합니다.</p></Link></article>
        </div>
      </section>

      <section className="directions section" id="location">
        <div className="directions-copy">
          <p className="section-kicker">DIRECTIONS</p>
          <h2>오시는 길</h2>
          <p className="directions-address">{address}</p>
          <small className="postal-code">우편번호 {postalCode}</small>
          <p className="muted">네이버 지도에서 정확한 위치와 이동 경로를 확인할 수 있습니다.</p>
          <div className="address-actions"><AddressCopy address={address} /><a className="naver-map-button" href={naverMap} target="_blank" rel="noreferrer">네이버 지도에서 보기 <span aria-hidden="true">↗</span></a><a className="naver-map-button" href={`https://map.kakao.com/link/search/${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">카카오맵에서 보기 ↗</a></div>
        </div>
        <MapPreview />
      </section>

      <SiteFooter />
    </main>
  );
}
