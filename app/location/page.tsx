import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { MapPreview } from "../components/map-preview";

const naverMap = "https://map.naver.com/p/search/%EC%A0%84%EB%B6%81%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%98%EB%8F%84%20%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4";

export default function LocationPage() {
  return (
    <main className="sub-page compact-page location-page">
      <SiteHeader />
      <SubHero
        kicker="DIRECTIONS"
        title="오시는 길"
        description="자유개혁교회로 오시는 길을 안내합니다."
      />
      <section className="directions section compact-directions">
        <div className="directions-copy">
          <p className="section-kicker">ADDRESS</p>
          <h2>자유개혁교회</h2>
          <p className="directions-address">전북특별자치도 전주시 덕진구<br />동가재미1길 6-4</p>
          <small className="postal-code">우편번호 55019</small>
          <p className="muted">네이버 지도에서 정확한 위치와 이동 경로를 확인할 수 있습니다.</p>
          <a className="naver-map-button" href={naverMap} target="_blank" rel="noreferrer">네이버 지도에서 보기 <span aria-hidden="true">↗</span></a>
        </div>
        <MapPreview />
      </section>
      <SiteFooter />
    </main>
  );
}
