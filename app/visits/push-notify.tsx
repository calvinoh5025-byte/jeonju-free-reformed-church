"use client";

import { useEffect, useState } from "react";
import styles from "./push-notify.module.css";

type Kind = "elder" | "deacon" | "special";
type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";
const KINDS: Array<[Kind, string]> = [["elder", "장로 심방"], ["deacon", "집사 심방"], ["special", "특별 심방"]];
const SAVED = "frck-visit-push-kinds";

function toKey(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "처리하지 못했습니다.");
  return data as Record<string, unknown>;
}

// 성도·직분자 누구나 쓰는 푸시 알림 신청. 이름·이메일·전화번호는 받지 않고, 이 기기의 알림 주소만 서버에 저장합니다.
export function PushNotify() {
  const [state, setState] = useState<State>("loading");
  const [kinds, setKinds] = useState<Kind[]>(["elder", "deacon", "special"]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const saved = JSON.parse(localStorage.getItem(SAVED) ?? "null") as Kind[] | null; if (Array.isArray(saved) && saved.length) setKinds(saved); } catch { /* 무시 */ }
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) { if (alive) setState(ios && !standalone ? "ios-install" : "unsupported"); return; }
      if (Notification.permission === "denied") { if (alive) setState("denied"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (alive) setState(sub ? "on" : "off");
      } catch { if (alive) setState("off"); }
    })();
    return () => { alive = false; };
  }, []);

  const toggleKind = (kind: Kind) => setKinds(prev => { const next = prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind]; return next.length ? next : prev; });

  async function enable() {
    setBusy(true); setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); setMsg(permission === "denied" ? "" : "알림을 허용하지 않으셨습니다."); return; }
      const reg = await navigator.serviceWorker.ready;
      const keyResponse = await fetch("/api/visit-push/key");
      const { publicKey } = await keyResponse.json() as { publicKey?: string };
      if (!keyResponse.ok || !publicKey) throw new Error("알림 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as unknown as BufferSource }));
      try { await post("/api/visit-push/subscribe", { subscription: sub.toJSON(), kinds }); }
      catch (e) { await sub.unsubscribe().catch(() => null); throw e; }
      try { localStorage.setItem(SAVED, JSON.stringify(kinds)); } catch { /* 무시 */ }
      setState("on"); setMsg("알림을 켰습니다. 아래 '시험 알림 보내기'를 눌러 잘 오는지 확인해 보세요.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "알림을 켜지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function saveKinds() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setState("off"); return; }
      await post("/api/visit-push/subscribe", { subscription: sub.toJSON(), kinds });
      try { localStorage.setItem(SAVED, JSON.stringify(kinds)); } catch { /* 무시 */ }
      setMsg("받을 심방 종류를 저장했습니다.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { const endpoint = sub.endpoint; await sub.unsubscribe(); await post("/api/visit-push/unsubscribe", { endpoint }).catch(() => null); }
      setState("off"); setMsg("알림을 껐습니다.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "알림을 끄지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function sendTest() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setState("off"); return; }
      await post("/api/visit-push/test", { endpoint: sub.endpoint });
      setMsg("시험 알림을 보냈습니다. 잠시 뒤 알림이 오는지 확인해 주세요.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "시험 알림을 보내지 못했습니다."); }
    finally { setBusy(false); }
  }

  return (
    <section className={styles.box} aria-label="심방 일정 알림">
      <h2>심방 일정 알림</h2>
      <p className={styles.lead}>전날 저녁 6시와 당일 아침 7시에 그날의 심방 일정을 폰으로 알려 드립니다. 일정이 취소되거나 시간이 바뀌면 바로 알려 드립니다.</p>
      {state === "loading" && <p className={styles.help}>확인하는 중입니다…</p>}
      {state === "unsupported" && <p className={styles.help}>이 브라우저에서는 알림을 지원하지 않습니다. 안드로이드는 크롬이나 삼성 인터넷, 컴퓨터는 크롬·엣지·사파리를 이용해 주세요. 카카오톡 안에서 열었다면 "다른 브라우저로 열기"를 눌러 주세요.</p>}
      {state === "ios-install" && <p className={styles.help}><b>아이폰은 먼저 앱처럼 설치해야 알림을 받을 수 있습니다.</b> 사파리 아래의 공유 버튼(□↑)을 누르고 <b>"홈 화면에 추가"</b>를 누른 뒤, 홈 화면에 생긴 자유개혁교회 아이콘으로 열어서 이 페이지에 다시 오세요. (아이폰 iOS 16.4 이상)</p>}
      {state === "denied" && <p className={styles.help}>이 사이트의 알림이 꺼져 있습니다. 브라우저 설정에서 <b>자유개혁교회(freerck.com) 알림을 "허용"</b>으로 바꾼 뒤 이 페이지를 새로 고쳐 주세요.</p>}
      {(state === "off" || state === "on") && (
        <>
          <fieldset className={styles.kinds}>
            <legend>받고 싶은 심방</legend>
            {KINDS.map(([key, label]) => <label key={key}><input type="checkbox" checked={kinds.includes(key)} onChange={() => toggleKind(key)} /> {label}</label>)}
          </fieldset>
          {state === "off" && <button type="button" className={styles.primary} onClick={enable} disabled={busy}>{busy ? "처리 중…" : "알림 받기"}</button>}
          {state === "on" && (
            <div className={styles.row}>
              <button type="button" onClick={saveKinds} disabled={busy}>받을 종류 저장</button>
              <button type="button" onClick={sendTest} disabled={busy}>시험 알림 보내기</button>
              <button type="button" onClick={disable} disabled={busy}>알림 끄기</button>
            </div>
          )}
          {state === "on" && <p className={styles.ok}>이 기기는 알림을 받고 있습니다.</p>}
        </>
      )}
      {msg && <p className={styles.help} role="status">{msg}</p>}
      <p className={styles.small}>이 기기의 알림 주소만 저장하며 이름·이메일·전화번호는 받지 않습니다. 알림에는 날짜·시간·심방 종류만 나오고, 가정 이름은 나오지 않습니다.</p>
    </section>
  );
}
