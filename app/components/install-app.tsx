"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [runningAsApp, setRunningAsApp] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setRunningAsApp(standalone);
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setInstallComplete(sessionStorage.getItem("frck-install-complete") === "yes");

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      sessionStorage.setItem("frck-install-complete", "yes");
      setInstallComplete(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (runningAsApp) return null;

  const install = async () => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const url = `${location.origin}/?source=pwa-install`;
    // In-app browsers (KakaoTalk, Naver, Instagram, Facebook, Line, Daum) cannot install apps: hand off to the phone's real browser.
    if (/KAKAOTALK/i.test(ua)) { location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`; return; }
    if (/\bLine\//i.test(ua)) { location.href = `${url}&openExternalBrowser=1`; return; }
    if (!isIOS && /NAVER|Instagram|FBAN|FBAV|FB_IAB|DaumApps|wv\)/i.test(ua)) {
      location.href = `intent://${location.host}/?source=pwa-install#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
    let event = promptEvent;
    if (!event && !isIOS) {
      // The browser may fire its install event a moment after the page loads; wait briefly before falling back to the guide.
      event = await new Promise<InstallPromptEvent | null>(resolve => {
        const done = (e: Event) => { e.preventDefault(); resolve(e as InstallPromptEvent); };
        window.addEventListener("beforeinstallprompt", done, { once: true });
        setTimeout(() => { window.removeEventListener("beforeinstallprompt", done); resolve(null); }, 2500);
      });
    }
    if (!event) {
      setShowHelp(true);
      return;
    }
    const promptEvent_ = event;
    await promptEvent_.prompt();
    const choice = await promptEvent_.userChoice;
    if (choice.outcome === "accepted") {
      sessionStorage.setItem("frck-install-complete", "yes");
      setInstallComplete(true);
    }
    setPromptEvent(null);
  };

  return (
    <div className="install-app">
      {installComplete ? (
        <>
          <a className="install-button open-app-button" href="/?source=pwa-open" target="_blank" rel="noreferrer">
            <span aria-hidden="true">↗</span> 자유개혁교회 앱 열기
          </a>
          <p>열리지 않으면 홈 화면의 자유개혁교회 아이콘을 눌러주세요.</p>
        </>
      ) : (
        <>
          <button className="install-button" type="button" onClick={install}>
            <span aria-hidden="true">＋</span> 자유개혁교회 앱 설치
          </button>
          <p>설치가 끝나면 바로 앱을 열 수 있습니다.</p>
        </>
      )}
      {showHelp && (
        <div className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
          <button className="install-help-close" type="button" onClick={() => setShowHelp(false)} aria-label="설치 안내 닫기">×</button>
          <strong id="install-help-title">홈 화면에 설치하기</strong>
          {ios
            ? <><p>아이폰은 애플 정책상 버튼 한 번으로 설치할 수 없습니다. 두 단계만 해 주세요.</p><p><b>1.</b> 화면 아래 공유 버튼(□↑)을 누르세요.</p><p><b>2.</b> "홈 화면에 추가"를 누르세요.</p></>
            : <p>브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요.</p>}
        </div>
      )}
    </div>
  );
}
