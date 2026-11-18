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

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setRunningAsApp(standalone);
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
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
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
          <p><b>삼성 인터넷·크롬</b><br />브라우저 메뉴(⋮) → 앱 설치 또는 홈 화면에 추가</p>
          <p><b>아이폰 Safari</b><br />공유 버튼(□↑) → 홈 화면에 추가</p>
        </div>
      )}
    </div>
  );
}
