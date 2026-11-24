"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./manage.module.css";

type User = { name: string; role: "admin" | "staff" };
type Edit = { name: string; action: string; at: string };
type Visit = { id: number; starts_at: string; kind: "elder" | "deacon" | "special"; pastor: boolean; status: "scheduled" | "done" | "cancelled"; target_ids: number[]; memo: string | null; edits: Edit[] };
type Target = { id: number; name: string; note: string | null; tags: string[]; family: string | null; active: boolean };
type Round = { id: number; title: string; starts_on: string; ends_on: string; tag: string | null; include_family: boolean };
const splitTags = (text: string) => text.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
type Tab = "visits" | "progress" | "roster" | "admin";

const kindLabel = { elder: "장로 심방", deacon: "집사 심방", special: "특별 심방" } as const;
const statusLabel = { scheduled: "예정", done: "완료", cancelled: "취소" } as const;
const kstInput = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const kstShow = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const kstShort = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const kstDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const kstMD = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
const toInput = (iso: string) => kstInput.format(new Date(iso)).replace(" ", "T");
const fromInput = (value: string) => `${value}:00+09:00`;
const NAME_KEY = "frck-visit-name";
// 시간은 30분 단위 목록에서 고릅니다(어르신이 쓰기 쉽게). 목록에 없는 시간으로 저장된 일정은 그 시간도 함께 보여 줍니다.
const timeLabel = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`; };
const baseTimes = Array.from({ length: 33 }, (_, i) => { const t = 6 * 60 + i * 30; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; });
const VISIT_MINUTES = 60; // 서버와 같은 기준: 앞뒤 1시간 안에 다른 일정이 있으면 겹침
const toMinutes = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
function TimeSelect({ value, blocked }: { value?: string; blocked: string[] }) {
  const list = value && !baseTimes.includes(value) ? [...baseTimes, value].sort() : baseTimes;
  const isBlocked = (t: string) => blocked.some(b => Math.abs(toMinutes(b) - toMinutes(t)) < VISIT_MINUTES);
  return <select name="time" required defaultValue={value && !isBlocked(value) ? value : ""}><option value="" disabled>시간을 고르세요</option>{list.map(t => <option key={t} value={t} disabled={isBlocked(t)}>{timeLabel(t)}{isBlocked(t) ? "  (일정 있음)" : ""}</option>)}</select>;
}

async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "처리하지 못했습니다.");
  return data as Record<string, unknown>;
}
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export function ManageClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    try { setSavedName(localStorage.getItem(NAME_KEY) ?? ""); } catch { /* 저장소를 쓸 수 없어도 괜찮습니다 */ }
    call("/api/visit-auth", "GET").then(data => setUser((data.user as User | null) ?? null)).catch(() => setUser(null));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const data = await call("/api/visit-auth", "POST", { name: form.get("name"), password: form.get("password"), remember: form.get("remember") === "on" });
      try { localStorage.setItem(NAME_KEY, String(form.get("name"))); } catch { /* 무시 */ }
      setUser(data.user as User);
    } catch (e) { setError(errText(e, "로그인하지 못했습니다.")); }
  }
  async function logout() { await call("/api/visit-auth", "DELETE").catch(() => null); setUser(null); }

  if (user === undefined) return <section className={styles.wrap}><p>불러오는 중입니다…</p></section>;
  if (!user) return (
    <section className={styles.wrap}>
      <form className={styles.card} onSubmit={login} key={savedName}>
        <h2>직분자 로그인</h2>
        <p className={styles.help}>이름을 적고 직분자 공용 비밀번호를 입력해 주세요. 아래 "로그인 유지"를 체크하면 이 기기에서는 오래 유지됩니다.</p>
        <label>이름<input name="name" type="text" maxLength={50} autoComplete="name" required defaultValue={savedName} placeholder="예: 홍길동 장로" /></label>
        <label>비밀번호<input name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required /></label>
        <label className={styles.check}><input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} /> 비밀번호 보이게 하기</label>
        <label className={styles.check}><input name="remember" type="checkbox" defaultChecked /> 로그인 유지 <small>(이 기기에서 90일. 공용 기기라면 체크를 풀어 주세요)</small></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} type="submit">로그인</button>
        <p className={styles.help}><Link href="/visits">← 심방 일정 달력으로</Link></p>
      </form>
    </section>
  );
  return <Panel user={user} onLogout={logout} />;
}

function Panel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("visits");
  const [roster, setRoster] = useState<Target[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState("");

  const loadRoster = useCallback(async () => { try { const d = await call("/api/visit-targets", "GET"); setRoster(d.targets as Target[]); } catch (e) { setError(errText(e, "명단을 불러오지 못했습니다.")); } }, []);
  const loadRounds = useCallback(async () => { try { const d = await call("/api/visit-rounds", "GET"); setRounds(d.rounds as Round[]); } catch (e) { setError(errText(e, "심방 시기를 불러오지 못했습니다.")); } }, []);
  useEffect(() => { loadRoster(); loadRounds(); }, [loadRoster, loadRounds]);

  const tabs: Array<[Tab, string]> = [["visits", "일정"], ["progress", "심방 현황"], ["roster", "대상자 명단"]];
  if (user.role === "admin") tabs.push(["admin", "관리"]);

  return (
    <section className={styles.wrap}>
      <div className={styles.bar}><span>{user.name}{user.role === "admin" ? " · 관리자" : ""}</span><span><Link href="/visits">달력 보기</Link> <button onClick={onLogout}>로그아웃</button></span></div>
      <div className={styles.tabs} role="tablist">{tabs.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? styles.tabOn : ""} onClick={() => setTab(key)}>{label}</button>)}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {tab === "visits" && <VisitsTab roster={roster} />}
      {tab === "progress" && <ProgressTab roster={roster} rounds={rounds} reloadRounds={loadRounds} />}
      {tab === "roster" && <RosterTab roster={roster} reload={loadRoster} />}
      {tab === "admin" && user.role === "admin" && <PasswordAdmin />}
    </section>
  );
}

function TargetPicker({ roster, value, onChange }: { roster: Target[]; value: number[]; onChange: (ids: number[]) => void }) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(roster.map(t => [t.id, t])), [roster]);
  const q = query.trim();
  const suggestions = useMemo(() => (q ? roster.filter(t => t.active && !value.includes(t.id) && (t.name.includes(q) || (t.family ?? "").includes(q))).slice(0, 8) : []), [q, roster, value]);
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>심방 대상자 <small>(비공개 · 명단에서 여러 명 고르기)</small></span>
      {value.length > 0 && <ul className={styles.chips}>{value.map(id => { const t = byId.get(id); const mates = t?.family ? roster.filter(x => x.active && x.family === t.family && !value.includes(x.id)) : []; return <li key={id}>{t?.name ?? `#${id}`}{mates.length > 0 && <button type="button" className={styles.fam} onClick={() => onChange([...value, ...mates.map(x => x.id)].slice(0, 20))}>+가족 {mates.length}명</button>}<button type="button" aria-label="빼기" onClick={() => onChange(value.filter(item => item !== id))}>×</button></li>; })}</ul>}
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름 일부를 쓰면 명단에서 찾아 줍니다" aria-label="심방 대상자 찾기" />
      {suggestions.length > 0 && <div className={styles.suggest}>{suggestions.map(t => <button type="button" key={t.id} onClick={() => { if (value.length < 20) onChange([...value, t.id]); setQuery(""); }}>{t.name}{t.family ? <small> {t.family}</small> : null}</button>)}</div>}
      {q && suggestions.length === 0 && <p className={styles.help}>명단에서 찾을 수 없습니다. 이미 골랐거나, <b>대상자 명단</b> 탭에서 먼저 추가해 주세요.</p>}
    </div>
  );
}

const kstDow = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short" });
const kstHM = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
const kindClass = (kind: Visit["kind"]) => (kind === "deacon" ? styles.deacon : kind === "special" ? styles.special : styles.elder);

function VisitsTab({ roster }: { roster: Target[] }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Visit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [formDate, setFormDate] = useState("");
  const byId = useMemo(() => new Map(roster.map(t => [t.id, t])), [roster]);

  const reload = useCallback(async () => {
    try { const data = await call("/api/visits", "GET"); setVisits(data.visits as Visit[]); setError(""); }
    catch (e) { setError(errText(e, "일정을 불러오지 못했습니다.")); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setPicked(editing?.target_ids ?? []); setFormDate(editing ? toInput(editing.starts_at).slice(0, 10) : ""); if (editing) setFormOpen(true); }, [editing]);
  // 고른 날짜에 이미 있는 일정(취소 제외, 수정 중인 일정 제외)의 시간은 고를 수 없게 막습니다.
  const blockedTimes = useMemo(() => (formDate ? visits.filter(v => v.status !== "cancelled" && v.id !== editing?.id && toInput(v.starts_at).slice(0, 10) === formDate).map(v => toInput(v.starts_at).slice(11, 16)) : []), [visits, formDate, editing]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = { starts_at: `${form.get("date")}T${form.get("time")}:00+09:00`, kind: form.get("kind"), pastor: form.get("pastor") === "on", target_ids: picked, memo: form.get("memo") };
    setError(""); setNotice("");
    try {
      if (editing) await call("/api/visits", "PATCH", { id: editing.id, ...body }); else await call("/api/visits", "POST", body);
      setNotice(editing ? "수정했습니다." : "저장했습니다.");
      setEditing(null); setPicked([]); setFormDate(""); setFormOpen(false); formElement.reset(); await reload();
    } catch (e) { setError(errText(e, "저장하지 못했습니다.")); }
  }
  async function patch(visit: Visit, fields: Record<string, unknown>, message: string) {
    setError(""); setNotice("");
    try { await call("/api/visits", "PATCH", { id: visit.id, ...fields }); setNotice(message); await reload(); }
    catch (e) { setError(errText(e, "처리하지 못했습니다.")); }
  }
  async function remove(visit: Visit) {
    if (!confirm("이 일정을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setError(""); setNotice("");
    try { await call("/api/visits", "DELETE", { id: visit.id }); setNotice("삭제했습니다."); await reload(); }
    catch (e) { setError(errText(e, "삭제하지 못했습니다.")); }
  }
  const namesOf = (v: Visit) => v.target_ids.map(id => byId.get(id)?.name ?? "(삭제됨)");
  const brief = (names: string[]) => (names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}명`);

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const shown = visits.filter(v => showPast || new Date(v.starts_at).getTime() >= cutoff);

  return (
    <>
      <details className={styles.add} open={formOpen} onToggle={e => { const open = e.currentTarget.open; setFormOpen(open); if (!open) setEditing(null); }}>
        <summary>{editing ? "일정 수정" : "＋ 일정 추가"}</summary>
        <form onSubmit={save} key={editing ? `edit-${editing.id}` : "new"}>
          <label>날짜<input name="date" type="date" required value={formDate} onChange={e => setFormDate(e.target.value)} /></label>
          <label>시간<TimeSelect key={`${formDate}-${editing?.id ?? "new"}`} value={editing ? toInput(editing.starts_at).slice(11, 16) : undefined} blocked={blockedTimes} /></label>
          {blockedTimes.length > 0 && <p className={styles.help}>이 날 이미 일정이 있는 시간(앞뒤 1시간)은 고를 수 없습니다.</p>}
          <label>심방 종류<select name="kind" defaultValue={editing?.kind ?? "elder"}><option value="elder">장로 심방 (성찬 심방)</option><option value="deacon">집사 심방</option><option value="special">특별 심방</option></select></label>
          <TargetPicker roster={roster} value={picked} onChange={setPicked} />
          <label className={styles.check}><input name="pastor" type="checkbox" defaultChecked={editing?.pastor ?? false} /> 목사 동행 <small>(성도 화면에도 표시)</small></label>
          <label>메모 <small>(비공개)</small><textarea name="memo" rows={2} maxLength={2000} defaultValue={editing?.memo ?? ""} /></label>
          <div className={styles.row}><button className={styles.primary} type="submit">{editing ? "수정 저장" : "저장"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setFormOpen(false); }}>취소</button>}</div>
        </form>
      </details>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <div className={styles.listHead}><h2>일정</h2><label className={styles.check}><input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} /> 지난 일정도</label></div>
      {shown.length === 0 && <p className={styles.help}>표시할 일정이 없습니다.</p>}
      <div className={styles.vlist}>
        {shown.map(v => {
          const names = namesOf(v);
          return (
            <details key={v.id} className={`${styles.vi} ${v.status !== "scheduled" ? styles.dim : ""}`}>
              <summary>
                <span className={styles.when}><b>{kstDow.format(new Date(v.starts_at))}</b> {kstHM.format(new Date(v.starts_at))}</span>
                <span className={kindClass(v.kind)}>{kindLabel[v.kind]}</span>
                <span className={styles.who}>{brief(names)}</span>
                {v.pastor && <span className={styles.chip}>목사 동행</span>}
                {v.status !== "scheduled" && <span className={styles.chip}>{statusLabel[v.status]}</span>}
              </summary>
              <div className={styles.vbody}>
                {names.length > 0 && <p><b>대상자</b> {names.join(", ")}</p>}
                {v.memo && <p><b>메모</b> {v.memo}</p>}
                <div className={styles.row}>
                  {v.status === "done" ? <button onClick={() => patch(v, { status: "scheduled" }, "예정으로 되돌렸습니다.")}>완료 취소</button> : <button className={styles.primary} onClick={() => patch(v, { status: "done" }, "완료로 표시했습니다.")}>완료</button>}
                  <button onClick={() => { setEditing(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
                  {v.status === "cancelled" ? <button onClick={() => patch(v, { status: "scheduled" }, "예정으로 되돌렸습니다.")}>취소 해제</button> : <button onClick={() => patch(v, { status: "cancelled" }, "취소 처리했습니다. 성도 화면에서 사라집니다.")}>일정 취소</button>}
                  <button onClick={() => remove(v)}>삭제</button>
                  <span className={styles.hist}>
                    <button type="button" aria-haspopup="true">수정 기록{v.edits.length > 0 ? ` ${v.edits.length}` : ""}</button>
                    <span className={styles.pop} role="tooltip">
                      <strong>최근 수정한 분 (최대 10건)</strong>
                      {v.edits.length === 0 ? <em>기록이 없습니다.</em> : <ol>{v.edits.map((edit, index) => <li key={index}>{kstShort.format(new Date(edit.at))} · <b>{edit.name}</b> {edit.action}</li>)}</ol>}
                    </span>
                  </span>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
type Group = { done: Array<{ t: Target; at: string }>; planned: Array<{ t: Target; at: string }>; todo: Target[] };

// 한 심방 시기에서 대상자별로 완료/예정/아직을 계산합니다. (취소된 일정은 계산하지 않음)
function calcGroups(round: Round, visits: Visit[], roster: Target[]): Group {
  const done: Group["done"] = [], planned: Group["planned"] = [], todo: Target[] = [];
  const valid = visits.filter(v => v.status !== "cancelled" && kstDay.format(new Date(v.starts_at)) >= round.starts_on && kstDay.format(new Date(v.starts_at)) <= round.ends_on);
  const tagName = round.tag;
  const hasTag = (item: Target) => !!tagName && (item.tags ?? []).includes(tagName);
  const families = new Set(roster.filter(hasTag).map(item => item.family).filter(Boolean));
  const scope = roster.filter(item => item.active && (!tagName || hasTag(item) || (round.include_family && !!item.family && families.has(item.family))));
  for (const t of scope) {
    const related = valid.filter(v => v.target_ids.includes(t.id));
    const d = related.filter(v => v.status === "done").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
    const p = related.filter(v => v.status === "scheduled").sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    if (d) done.push({ t, at: d.starts_at }); else if (p) planned.push({ t, at: p.starts_at }); else todo.push(t);
  }
  return { done, planned, todo };
}
const totalOf = (g: Group) => g.done.length + g.planned.length + g.todo.length;

function ProgressTab({ roster, rounds, reloadRounds }: { roster: Target[]; rounds: Round[]; reloadRounds: () => Promise<void> }) {
  const [roundId, setRoundId] = useState<number | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const today = kstDay.format(new Date());
  const round = rounds.find(r => r.id === roundId) ?? rounds.find(r => r.starts_on <= today && today <= r.ends_on) ?? rounds[0] ?? null;
  const yearOfRound = round ? round.starts_on.slice(0, 4) : "";
  const yearRounds = useMemo(() => rounds.filter(r => r.starts_on.slice(0, 4) === yearOfRound).sort((a, b) => a.starts_on.localeCompare(b.starts_on)), [rounds, yearOfRound]);
  const rangeFrom = yearRounds.length ? yearRounds.reduce((m, r) => (r.starts_on < m ? r.starts_on : m), yearRounds[0].starts_on) : "";
  const rangeTo = yearRounds.length ? yearRounds.reduce((m, r) => (r.ends_on > m ? r.ends_on : m), yearRounds[0].ends_on) : "";

  useEffect(() => {
    if (!rangeFrom || !rangeTo) { setVisits([]); return; }
    let alive = true;
    const from = `${rangeFrom}T00:00:00+09:00`, to = `${rangeTo}T23:59:59+09:00`;
    call(`/api/visits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, "GET").then(d => { if (alive) setVisits(d.visits as Visit[]); }).catch(e => { if (alive) setError(errText(e, "일정을 불러오지 못했습니다.")); });
    return () => { alive = false; };
  }, [rangeFrom, rangeTo]);

  const groups = useMemo(() => (round ? calcGroups(round, visits, roster) : { done: [], planned: [], todo: [] } as Group), [round, visits, roster]);
  const allTags = useMemo(() => Array.from(new Set(roster.flatMap(t => t.tags ?? []))).sort(), [roster]);
  const total = totalOf(groups);
  const pct = total ? Math.round((groups.done.length / total) * 100) : 0;
  const tagLabel = (r: Round) => (r.tag ? `${r.tag}${r.include_family ? " + 가족" : ""}` : "명단 전체");

  async function createOne(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(""); setNotice("");
    try { await call("/api/visit-rounds", "POST", { title: form.get("title"), starts_on: form.get("starts_on"), ends_on: form.get("ends_on"), tag: form.get("tag") || null, include_family: form.get("include_family") === "on" }); formElement.reset(); setNotice("심방 시기를 만들었습니다."); setRoundId(null); await reloadRounds(); }
    catch (e) { setError(errText(e, "저장하지 못했습니다.")); }
  }
  async function removeRound(r: Round) {
    if (!confirm(`'${r.title}' 시기를 삭제할까요? 일정은 지워지지 않습니다.`)) return;
    try { await call("/api/visit-rounds", "DELETE", { id: r.id }); setRoundId(null); await reloadRounds(); } catch (e) { setError(errText(e, "삭제하지 못했습니다.")); }
  }
  const nameList = (items: Array<{ t: Target; at?: string }>) => <ul className={styles.names}>{items.map(x => <li key={x.t.id}>{x.t.name}{x.t.family ? <small> {x.t.family}</small> : null}{x.at ? <small> {kstMD.format(new Date(x.at))}</small> : null}</li>)}</ul>;

  return (
    <>
      {round ? (
        <div className={styles.card}>
          <h2>이번 심방 현황</h2>
          {yearRounds.length > 1 && (
            <>
              <h3>{yearOfRound}년 차수별 <small>(누르면 아래에서 자세히)</small></h3>
              <ul className={styles.yr}>
                {yearRounds.map(r => { const g = calcGroups(r, visits, roster); const t = totalOf(g); return (
                  <li key={r.id}><button type="button" onClick={() => setRoundId(r.id)} aria-current={r.id === round.id}>{r.id === round.id ? "▶ " : ""}{r.title}</button><span>완료 {g.done.length}/{t}</span><span className={styles.meter}><span style={{ width: `${t ? Math.round((g.done.length / t) * 100) : 0}%` }} /></span></li>
                ); })}
              </ul>
            </>
          )}
          <label>심방 시기<select value={round.id} onChange={e => setRoundId(Number(e.target.value))}>{rounds.map(r => <option key={r.id} value={r.id}>{r.title} · {tagLabel(r)} ({r.starts_on} ~ {r.ends_on})</option>)}</select></label>
          <p className={styles.sum}><b>{round.title}</b> <small>· 대상: {tagLabel(round)}</small></p>
          <p className={styles.sum}><b>완료 {groups.done.length}명</b> · 예정 {groups.planned.length}명 · 아직 {groups.todo.length}명 <small>(전체 {total}명)</small></p>
          <div className={styles.bar2} aria-label={`완료 ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
          <details className={styles.grp} open={groups.todo.length > 0 && groups.todo.length <= 30}><summary><span className={styles.gTodo}>아직 심방하지 않음</span><small>{groups.todo.length}명</small></summary><div className={styles.inner}>{groups.todo.length === 0 ? <p className={styles.help}>모두 일정이 잡혔거나 완료되었습니다.</p> : nameList(groups.todo.map(t => ({ t })))}</div></details>
          <details className={styles.grp}><summary><span className={styles.gPlan}>일정 예정</span><small>{groups.planned.length}명</small></summary><div className={styles.inner}>{groups.planned.length === 0 ? <p className={styles.help}>없음</p> : nameList(groups.planned)}</div></details>
          <details className={styles.grp}><summary><span className={styles.gDone}>심방 완료</span><small>{groups.done.length}명</small></summary><div className={styles.inner}>{groups.done.length === 0 ? <p className={styles.help}>없음</p> : nameList(groups.done)}</div></details>
          <p className={styles.help}>일정에서 <b>완료</b>를 누르면 그 일정에 넣은 대상자가 완료로 바뀝니다. 명단에서 '사용 안 함'으로 둔 분은 계산에서 빠집니다.</p>
          <button type="button" onClick={() => removeRound(round)}>이 심방 시기 삭제</button>
        </div>
      ) : <div className={styles.card}><h2>심방 시기가 없습니다</h2><p className={styles.help}>아래에서 첫 심방 시기(예: 2026년 1차 성찬 심방)를 만들어 주세요.</p></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <details className={styles.grp} open={!round}>
        <summary>＋ 새 심방 시기 만들기 <small>성찬 심방은 차수마다 하나씩</small></summary>
        <form className={styles.inner} onSubmit={createOne}>
          <label>이름<input name="title" maxLength={60} required placeholder="예: 2026년 1차 성찬 심방" /></label>
          <label>대상 범위 <small>(명단의 분류)</small><select name="tag" defaultValue=""><option value="">명단 전체</option>{allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></label>
          <label className={styles.check}><input name="include_family" type="checkbox" /> 가족도 함께 포함</label>
          <label>시작일<input name="starts_on" type="date" required /></label>
          <label>종료일<input name="ends_on" type="date" required /></label>
          <button className={styles.primary} type="submit">만들기</button>
        </form>
      </details>
    </>
  );
}

function RosterTab({ roster, reload }: { roster: Target[]; reload: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");
  const [showOff, setShowOff] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [newTags, setNewTags] = useState("");
  const f = filter.trim();
  const allTags = useMemo(() => Array.from(new Set(roster.flatMap(t => t.tags ?? []))).sort(), [roster]);
  const families = useMemo(() => Array.from(new Set(roster.map(t => t.family).filter((x): x is string => !!x))).sort(), [roster]);
  const shown = roster.filter(t => (showOff || t.active) && (!f || t.name.includes(f) || (t.family ?? "").includes(f)) && (!tagFilter || (t.tags ?? []).includes(tagFilter)));
  const NONE = "가족 미지정";
  const grouped = useMemo(() => {
    const map = new Map<string, Target[]>();
    for (const t of shown) { const key = t.family || NONE; map.set(key, [...(map.get(key) ?? []), t]); }
    return Array.from(map.entries()).sort(([a], [b]) => (a === NONE ? 1 : b === NONE ? -1 : a.localeCompare(b, "ko")));
  }, [shown]);
  const searching = !!f || !!tagFilter;

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const names = String(form.get("names") ?? "").split(/[,\n]/).map(n => n.trim()).filter(Boolean);
    setError(""); setNotice("");
    try {
      const data = await call("/api/visit-targets", "POST", { names, note: form.get("note"), tags: splitTags(newTags), family: form.get("family") });
      formElement.reset(); setNewTags(""); await reload();
      const skipped = Number(data.skipped ?? 0);
      setNotice(`${(data.added as unknown[]).length}명을 추가했습니다.${skipped ? ` (이미 있는 ${skipped}명은 건너뜀)` : ""}`);
    } catch (e) { setError(errText(e, "추가하지 못했습니다.")); }
  }
  async function patch(t: Target, fields: Record<string, unknown>, message: string) {
    setError(""); setNotice("");
    try { await call("/api/visit-targets", "PATCH", { id: t.id, ...fields }); setNotice(message); await reload(); } catch (e) { setError(errText(e, "수정하지 못했습니다.")); }
  }

  return (
    <>
      <details className={styles.grp}>
        <summary>＋ 명단에 추가 <small>가족을 한꺼번에 넣을 수 있어요</small></summary>
        <form className={styles.inner} onSubmit={add}>
          <label>이름 <small>(여러 명이면 줄을 바꾸거나 쉼표로 구분)</small><textarea name="names" rows={4} required placeholder={"김OO\n이OO\n박OO"} /></label>
          <label>가족(가정) 이름 <small>(같은 가족이면 같은 이름 · 예: 김OO 가정)</small><input name="family" list="family-list" maxLength={50} placeholder="예: 김OO 가정" /></label>
          <datalist id="family-list">{families.map(name => <option key={name} value={name} />)}</datalist>
          <label>분류 <small>(쉼표로 구분 · 예: 성찬 참여 · 입력한 모든 분께 붙습니다. 자녀는 비워 두고 나중에 따로 정하세요)</small><input value={newTags} onChange={e => setNewTags(e.target.value)} maxLength={120} placeholder="예: 성찬 참여" /></label>
          {allTags.length > 0 && <div className={styles.suggest}>{allTags.map(tag => <button type="button" key={tag} onClick={() => { const list = splitTags(newTags); if (!list.includes(tag)) setNewTags([...list, tag].join(", ")); }}>+ {tag}</button>)}</div>}
          <label>메모 <small>(비공개 · 한 명만 추가할 때)</small><input name="note" maxLength={500} placeholder="예: 가족 구성, 주의할 점" /></label>
          <button className={styles.primary} type="submit">추가</button>
        </form>
      </details>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <div className={styles.listHead}><h2>심방 대상자 명단 <small>({roster.filter(t => t.active).length}명 · 가족 {families.length}곳)</small></h2><label className={styles.check}><input type="checkbox" checked={showOff} onChange={e => setShowOff(e.target.checked)} /> 사용 안 함도 보기</label></div>
      <label className={styles.search}><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="이름이나 가족으로 찾기" aria-label="명단에서 찾기" />{allTags.length > 0 && <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} aria-label="분류로 보기"><option value="">모든 분류</option>{allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select>}</label>
      {grouped.length === 0 && <p className={styles.help}>표시할 대상자가 없습니다.</p>}
      {grouped.map(([family, members]) => (
        <details key={`${family}-${searching}`} className={styles.grp} open={searching}>
          <summary><span>{family} <small>{members.length}명</small></span><small>{Array.from(new Set(members.flatMap(m => m.tags ?? []))).join(" · ")}</small></summary>
          <div className={styles.inner}>
            {members.map(t => (
              <div key={t.id} className={`${styles.item} ${t.active ? "" : styles.dim}`}>
                <div><strong>{t.name}</strong>{(t.tags ?? []).map(tag => <span key={tag} className={styles.chip}>{tag}</span>)}{!t.active && <span className={styles.chip}>사용 안 함</span>}</div>
                {t.note && <div className={styles.detail}><span>{t.note}</span></div>}
                <div className={styles.row}>
                  <button onClick={() => { const name = prompt("이름을 바꿉니다", t.name); if (name && name.trim() && name.trim() !== t.name) patch(t, { name: name.trim() }, "이름을 바꿨습니다."); }}>이름 수정</button>
                  <button onClick={() => { const fam = prompt("가족(가정) 이름을 입력하세요 (비우면 삭제)", t.family ?? ""); if (fam !== null) patch(t, { family: fam }, "가족을 저장했습니다."); }}>가족</button>
                  <button onClick={() => { const text = prompt("분류를 쉼표로 구분해 입력하세요 (예: 성찬 참여). 비우면 모두 삭제", (t.tags ?? []).join(", ")); if (text !== null) patch(t, { tags: splitTags(text) }, "분류를 저장했습니다."); }}>분류</button>
                  <button onClick={() => { const note = prompt("메모를 입력하세요 (비우면 삭제)", t.note ?? ""); if (note !== null) patch(t, { note }, "메모를 저장했습니다."); }}>메모</button>
                  <button onClick={() => patch(t, { active: !t.active }, t.active ? "사용 안 함으로 보관했습니다." : "다시 사용합니다.")}>{t.active ? "사용 안 함" : "다시 사용"}</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </>
  );
}
function PasswordAdmin() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [logins, setLogins] = useState<Array<{ name: string; role: string; at: string }>>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { call("/api/visit-settings", "GET").then(data => { setConfigured(data.configured === true); setLogins((data.logins as typeof logins) ?? []); }).catch(e => setError(errText(e, "설정을 불러오지 못했습니다."))); }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(""); setNotice("");
    try {
      await call("/api/visit-settings", "PUT", { password: form.get("password") });
      setConfigured(true); formElement.reset();
      setNotice("공용 비밀번호를 저장했습니다. 이전에 로그인한 직분자는 모두 로그아웃되었으니, 새 비밀번호를 직분자분들께 알려 주세요.");
    } catch (e) { setError(errText(e, "저장하지 못했습니다.")); }
  }
  return (
    <div className={styles.admin0}>
      <h2>직분자 공용 비밀번호 <small>(관리자 전용)</small></h2>
      <p className={styles.help}>{configured === null ? "불러오는 중입니다…" : configured ? "공용 비밀번호가 정해져 있습니다. 퇴임하신 분이 있거나 비밀번호가 새어 나갔다면 새로 바꾸세요. 바꾸는 즉시 모든 직분자가 로그아웃됩니다." : "아직 공용 비밀번호가 없습니다. 정하면 직분자분들이 로그인할 수 있습니다."}</p>
      <form className={styles.card} onSubmit={save}>
        <label>새 비밀번호 <small>(10자 이상. 짧은 숫자보다 긴 문장이 안전해요. 예: jeonju-visit-2026)</small><input name="password" type="text" minLength={10} maxLength={100} required autoComplete="off" /></label>
        <button className={styles.primary} type="submit">{configured ? "비밀번호 바꾸기" : "비밀번호 정하기"}</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <h2>최근 로그인 <small>(낯선 이름이 있으면 비밀번호를 바꾸세요)</small></h2>
      {logins.length === 0 ? <p className={styles.help}>아직 로그인 기록이 없습니다.</p> : <ul className={styles.list}>{logins.map((row, index) => <li key={index} className={styles.item}><span>{kstShort.format(new Date(row.at))} · <b>{row.name}</b>{row.role === "admin" ? " (관리자)" : ""}</span></li>)}</ul>}
    </div>
  );
}







