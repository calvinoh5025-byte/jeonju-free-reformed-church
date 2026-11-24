"use client";

import { useEffect, useState } from "react";
import styles from "./push-notify.module.css";

type Kind = "elder" | "deacon" | "special";
type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";
type Mode = "kinds" | "family";
type Family = { id: number; name: string };
const KINDS: Array<[Kind, string]> = [["elder", "장로 심방"], ["deacon", "집사 심방"], ["special", "특별 심방"]];
const SAVED = "frck-visit-push-kinds";
const SAVED_FAMILY = "frck-visit-push-families";
const MAX_FAMILIES = 10;

function toKey(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// 어느 단계에서 멈추더라도 '처리 중…'에 갇히지 않도록 시간 제한을 둡니다.
function limit<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    work.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

async function post(url: string, body: unknown) {
  const response = await limit(fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" }), 15000, "서버 응답이 없습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "처리하지 못했습니다.");
  return data as Record<string, unknown>;
}

// 성도·직분자 누구나 쓰는 푸시 알림 신청. 이름·이메일·전화번호는 받지 않고, 이 기기의 알림 주소만 서버에 저장합니다.
export function PushNotify() {
  const [state, setState] = useState<State>("loading");
  const [kinds, setKinds] = useState<Kind[]>(["elder", "deacon", "special"]);
  const [mode, setMode] = useState<Mode>("kinds");
  const [families, setFamilies] = useState<Family[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const saved = JSON.parse(localStorage.getItem(SAVED) ?? "null") as Kind[] | null; if (Array.isArray(saved) && saved.length) setKinds(saved); } catch { /* 무시 */ }
      try { const saved = JSON.parse(localStorage.getItem(SAVED_FAMILY) ?? "null") as number[] | null; if (Array.isArray(saved) && saved.length) { setPicked(saved); setMode("family"); } } catch { /* 무시 */ }
      fetch("/api/visit-push/families").then(r => r.json()).then((d: { families?: Family[] }) => { if (alive && Array.isArray(d.families)) setFamilies(d.families); }).catch(() => undefined);
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

  const ids = mode === "family" ? picked : [];
  const savedNow = (k: Kind[], f: number[]) => { try { localStorage.setItem(SAVED, JSON.stringify(k)); localStorage.setItem(SAVED_FAMILY, JSON.stringify(f)); } catch { /* 무시 */ } };

  // 이미 알림을 켠 기기는 고르는 즉시 서버에 저장합니다.
  async function saveNow(nextKinds: Kind[], nextIds: number[]) {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setState("off"); return; }
      await post("/api/visit-push/subscribe", { subscription: sub.toJSON(), kinds: nextKinds, target_ids: nextIds });
      savedNow(nextKinds, nextIds);
      setMsg("저장했습니다.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  const toggleKind = (kind: Kind) => {
    const next = kinds.includes(kind) ? kinds.filter(k => k !== kind) : [...kinds, kind];
    if (!next.length) return;
    setKinds(next);
    if (state === "on") void saveNow(next, ids);
  };
  const toggleFamily = (id: number) => {
    const has = picked.includes(id);
    if (!has && picked.length >= MAX_FAMILIES) { setMsg(`이름은 ${MAX_FAMILIES}명까지 고를 수 있습니다.`); return; }
    const next = has ? picked.filter(x => x !== id) : [...picked, id];
    setPicked(next);
    if (state === "on") void saveNow(kinds, next.length ? next : []);
  };
  const changeMode = (next: Mode) => {
    setMode(next);
    if (state === "on") void saveNow(kinds, next === "family" ? picked : []);
  };

  async function enable() {
    if (mode === "family" && !picked.length) { setMsg("내 이름을 한 명 이상 골라 주세요."); return; }
    setBusy(true); setStep("1/4 허용 확인 중…"); setMsg("");
    try {
      const permission = await limit(
        Notification.requestPermission(),
        30000,
        "알림 허용 창이 뜨지 않았습니다. 브라우저 주소창 왼쪽 자물쇠에서 알림을 허용해 주세요. 카카오톡 등 앱 안에서 열었다면 크롬이나 사파리로 열어 주세요."
      );
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); setMsg(permission === "denied" ? "" : "알림을 허용하지 않으셨습니다."); return; }
      setStep("2/4 준비 중…");
      const reg = await limit(navigator.serviceWorker.ready, 10000, "앱 준비가 끝나지 않았습니다. 페이지를 새로 고친 뒤 다시 눌러 주세요.");
      const keyResponse = await limit(fetch("/api/visit-push/key"), 10000, "알림 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const { publicKey } = await keyResponse.json() as { publicKey?: string };
      if (!keyResponse.ok || !publicKey) throw new Error("알림 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setStep("3/4 알림 연결 중…");
      const sub = (await reg.pushManager.getSubscription()) ?? (await limit(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as unknown as BufferSource }), 20000, "이 기기가 알림 서비스에 연결하지 못했습니다. 와이파이·데이터 연결과 VPN·절전 모드를 확인하고 다시 눌러 주세요. 삼성 인터넷이면 크롬으로도 시도해 보세요."));
      setStep("4/4 저장 중…");
      try { await post("/api/visit-push/subscribe", { subscription: sub.toJSON(), kinds, target_ids: ids }); }
      catch (e) { await sub.unsubscribe().catch(() => null); throw e; }
      savedNow(kinds, ids);
      setState("on"); setMsg("알림을 켰습니다. 아래 '시험 알림 보내기'를 눌러 잘 오는지 확인해 보세요.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "알림을 켜지 못했습니다."); }
    finally { setBusy(false); setStep(""); }
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

  const query = search.trim();
  const shown = families.filter(f => !query || f.name.includes(query));
  const summary = mode === "family"
    ? `내 심방: ${picked.map(id => families.find(f => f.id === id)?.name).filter(Boolean).join(", ") || "선택한 이름"}`
    : kinds.map(k => KINDS.find(([key]) => key === k)?.[1]).join(", ");

  return (
    <section className={styles.box} aria-label="심방 일정 알림">
      <h2>심방 일정 알림</h2>
      <p className={styles.lead}>전날 저녁 6시와 당일 아침 7시에 심방 일정을 폰으로 알려 드립니다. 일정이 취소되거나 시간이 바뀌면 바로 알려 드립니다.</p>
      {state === "loading" && <p className={styles.help}>확인하는 중입니다…</p>}
      {state === "unsupported" && <p className={styles.help}>이 브라우저에서는 알림을 지원하지 않습니다. 안드로이드는 크롬이나 삼성 인터넷, 컴퓨터는 크롬·엣지·사파리를 이용해 주세요. 카카오톡 안에서 열었다면 "다른 브라우저로 열기"를 눌러 주세요.</p>}
      {state === "ios-install" && <p className={styles.help}><b>아이폰은 먼저 앱처럼 설치해야 알림을 받을 수 있습니다.</b> 사파리 아래의 공유 버튼(□↑)을 누르고 <b>"홈 화면에 추가"</b>를 누른 뒤, 홈 화면에 생긴 자유개혁교회 아이콘으로 열어서 이 페이지에 다시 오세요. (아이폰 iOS 16.4 이상)</p>}
      {state === "denied" && <p className={styles.help}>이 사이트의 알림이 꺼져 있습니다. 브라우저 설정에서 <b>자유개혁교회(freerck.com) 알림을 "허용"</b>으로 바꾼 뒤 이 페이지를 새로 고쳐 주세요.</p>}
      {state === "on" && (
        <div className={styles.status} role="status">
          <strong>✓ 알림 수신 중</strong>
          <span>{summary}</span>
        </div>
      )}
      {(state === "off" || state === "on") && (
        <>
          <fieldset className={styles.kinds}>
            <legend>어떤 알림을 받을까요?</legend>
            <label><input type="radio" name="push-mode" checked={mode === "kinds"} onChange={() => changeMode("kinds")} /> 심방 종류별로 받기</label>
            <label><input type="radio" name="push-mode" checked={mode === "family"} onChange={() => changeMode("family")} /> 내 심방만 받기</label>
          </fieldset>
          {mode === "kinds" && (
            <fieldset className={styles.kinds}>
              <legend>받고 싶은 심방</legend>
              {KINDS.map(([key, label]) => <label key={key}><input type="checkbox" checked={kinds.includes(key)} onChange={() => toggleKind(key)} /> {label}</label>)}
            </fieldset>
          )}
          {mode === "family" && (
            <fieldset className={styles.kinds}>
              <legend>내 이름을 골라 주세요 (최대 {MAX_FAMILIES})</legend>
              {families.length === 0 ? <p className={styles.help}>아직 선택할 수 있는 성찬 심방 대상자가 없습니다. 교회에서 이번 성찬 심방 명단을 만들면 여기에 나타납니다.</p> : (
                <>
                  <input className={styles.search} type="search" placeholder="이름이나 성으로 찾기" value={search} onChange={e => setSearch(e.target.value)} aria-label="이름 찾기" />
                  <div className={styles.list}>
                    {shown.map(f => <label key={f.id}><input type="checkbox" checked={picked.includes(f.id)} onChange={() => toggleFamily(f.id)} /> {f.name}</label>)}
                    {!shown.length && <p className={styles.help}>찾는 이름이 없습니다.</p>}
                  </div>
                </>
              )}
            </fieldset>
          )}
          {state === "off" && <button type="button" className={styles.primary} onClick={enable} disabled={busy}>{busy ? (step || "처리 중…") : "알림 받기"}</button>}
          {state === "on" && (
            <div className={styles.row}>
              <button type="button" onClick={sendTest} disabled={busy}>시험 알림 보내기</button>
              <button type="button" onClick={disable} disabled={busy}>알림 끄기</button>
            </div>
          )}
        </>
      )}
      {msg && <p className={styles.help} role="status">{msg}</p>}
      <p className={styles.small}>이 기기의 알림 주소만 저장하며 이름·이메일·전화번호는 받지 않습니다. 알림에는 날짜·시간·심방 종류만 나오고, 이름은 나오지 않습니다.</p>
    </section>
  );
}
