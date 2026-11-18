import styles from "./motto.module.css";
import { MobileMenu } from "./components/mobile-menu";
import { MapPreview } from "./components/map-preview";
import { InstallApp } from "./components/install-app";
import { LearningResources } from "./components/learning-resources";

const youtube = "https://www.youtube.com/channel/UCF7kK_6xtj2aFUm3V0P91gA";
const facebook = "https://www.facebook.com/DongSupSong/";
const naverMap = "https://map.naver.com/p/search/%EC%A0%84%EB%B6%81%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%98%EB%8F%84%20%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4";

export default function Home() {
  return (
    <main className="home-page">
      <section className="hero" id="home">
        <header className="site-header">
          <a className="brand" href="#home" aria-label="자유개혁교회 홈">
            <span className="brand-mark">FRCK</span>
            <span>자유개혁교회</span>
          </a>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            <a href="/about">교회소개</a><a href="/church">우리의 신앙고백</a><a href="/sermons">설교</a>
            <a href="/board">자유게시판</a><a href="/resources">자료실</a><a href="/location">오시는 길</a>
          </nav>
          <MobileMenu />
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">FREE REFORMED CHURCH IN KOREA</p>
            <h1>말씀 위에 서는 교회,<br />언약 안에서 함께 걷는 공동체</h1>
            <div className="gold-rule" />
            <p className="lead">성경과 세 일치 신조를 따라 그리스도를 고백하며, 세대와 세대를 이어 신실한 교회를 세우시는 그리스도 안에서 살아갑니다.</p>
            <InstallApp />
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
          <article><span>01</span><h3>오직 성경</h3><p>성경을 신앙과 삶의 유일하고 충분한 규범으로 고백합니다.</p></article>
          <article><span>02</span><h3>세 일치 신조</h3><p>벨직 신앙고백, 하이델베르크 교리문답, 도르트 신경을 받아 고백합니다.</p></article>
          <article><span>03</span><h3>언약 공동체</h3><p>가정과 학교와 교회가 함께 다음 세대에 믿음을 전수하며 자라갑니다.</p></article>
        </div>
      </section>

      <section className="confessions section">
        <p className="section-kicker">THREE FORMS OF UNITY</p>
        <div className="section-heading"><h2>우리가 함께 고백하는 신앙</h2><p>우리는 교회가 성경을 따라 함께 고백해 온 믿음의 내용을 소중히 여깁니다.</p></div>
        <div className="confession-list">
          <article><a href="/resources/read/belgic" aria-label="벨직 신앙고백 원문 보기"><span>1561</span><h3>벨직 신앙고백</h3><p>삼위 하나님과 구원, 교회와 성례에 관한 성경적 신앙을 체계적으로 고백합니다.</p><strong>원문 보기 →</strong></a></article>
          <article><a href="/resources/read/heidelberg" aria-label="하이델베르크 교리문답 원문 보기"><span>1563</span><h3>하이델베르크 교리문답</h3><p>죄와 비참, 구원, 감사의 구조로 그리스도인의 유일한 위로를 가르칩니다.</p><strong>원문 보기 →</strong></a></article>
          <article><a href="/resources/read/dort" aria-label="도르트 신경 원문 보기"><span>1619</span><h3>도르트 신경</h3><p>하나님의 주권적 은혜와 성도의 견인을 분명하게 증언합니다.</p><strong>원문 보기 →</strong></a></article>
        </div>
      </section>

      <LearningResources />
      <section className="directions section" id="location">
        <div className="directions-copy">
          <p className="section-kicker">DIRECTIONS</p>
          <h2>오시는 길</h2>
          <p className="directions-address">전북특별자치도 전주시 덕진구<br />동가재미1길 6-4</p>
          <small className="postal-code">우편번호 55019</small>
          <p className="muted">네이버 지도에서 정확한 위치와 이동 경로를 확인할 수 있습니다.</p>
          <a className="naver-map-button" href={naverMap} target="_blank" rel="noreferrer">네이버 지도에서 보기 <span aria-hidden="true">↗</span></a>
        </div>
        <MapPreview />
      </section>

      <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">FRCK</span><span>자유개혁교회</span></a><p>말씀과 신앙고백 위에 세워지는 언약 공동체</p><div><a href={youtube} target="_blank" rel="noreferrer">YouTube</a><a href={facebook} target="_blank" rel="noreferrer">Facebook</a></div><small>© 2026 Free Reformed Church in Korea</small></footer>
    </main>
  );
}
