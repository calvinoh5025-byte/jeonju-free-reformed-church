const naverMap = "https://map.naver.com/p/search/%EC%A0%84%EB%B6%81%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%98%EB%8F%84%20%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4";
const mapPreview = "https://www.google.com/maps?q=%EC%A0%84%EB%B6%81%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%98%EB%8F%84%20%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4&output=embed";

export function MapPreview() {
  return <div className="map-preview">
    <iframe
      src={mapPreview}
      title="자유개혁교회 주변 동네 지도"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
    <a href={naverMap} target="_blank" rel="noreferrer" aria-label="네이버 지도에서 자유개혁교회 위치 크게 보기">
      네이버 지도에서 크게 보기 <span aria-hidden="true">↗</span>
    </a>
  </div>;
}
