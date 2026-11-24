"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./manage.module.css";

type User = { name: string; role: "admin" | "staff" };
type Edit = { name: string; action: string; at: string };
type Visit = { id: number; starts_at: string; kind: "elder" | "deacon"; pastor: boolean; status: "scheduled" | "done" | "cancelled"; target_ids: number[]; memo: string | null; edits: Edit[] };
type Target = { id: number; name: string; note: string | null; tags: string[]; active: boolean };
type Round = { id: number; title: string; starts_on: string; ends_on: string; tag: string | null };
const splitTags = (text: string) => text.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
type Tab = "visits" | "progress" | "roster" | "admin";

const statusLabel = { scheduled: "예정", done: "완료", cancelled: "취소" } as const;
const kstInput = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const kstShow = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const kstShort = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const kstDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const kstMD = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
const toInput = (iso: string) => kstInput.format(new Date(iso)).replace(" ", "T");
const fromInput = (value: string) => `${value}:00+09:00`;
const NAME_KEY = "frck-visit-name";

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

  useEffect(() => {
    try { setSavedName(localStorage.getItem(NAME_KEY) ?? ""); } catch { /* 저장소를 쓸 수 없어도 괜찮습니다 */ }
    call("/api/visit-auth", "GET").then(data => setUser((data.user as User | null) ?? null)).catch(() => setUser(null));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const data = await call("/api/visit-auth", "POST", { name: form.get("name"), password: form.get("password") });
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
        <p className={styles.help}>이름을 적고 직분자 공용 비밀번호를 입력해 주세요. 한 번 로그인하면 이 기기에서는 오래 유지됩니다.</p>
        <label>이름<input name="name" type="text" maxLength={50} autoComplete="name" required defaultValue={savedName} placeholder="예: 홍길동 장로" /></label>
        <label>비밀번호<input name="password" type="password" autoComplete="current-password" required /></label>
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
  const suggestions = useMemo(() => (q ? roster.filter(t => t.active && !value.includes(t.id) && t.name.includes(q)).slice(0, 8) : []), [q, roster, value]);
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>심방 대상자 <small>(비공개 · 명단에서 여러 명 고르기)</small></span>
      {value.length > 0 && <ul className={styles.chips}>{value.map(id => <li key={id}>{byId.get(id)?.name ?? `#${id}`}<button type="button" aria-label="빼기" onClick={() => onChange(value.filter(item => item !== id))}>×</button></li>)}</ul>}
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름 일부를 쓰면 명단에서 찾아 줍니다" aria-label="심방 대상자 찾기" />
      {suggestions.length > 0 && <div className={styles.suggest}>{suggestions.map(t => <button type="button" key={t.id} onClick={() => { if (value.length < 20) onChange([...value, t.id]); setQuery(""); }}>{t.name}{t.note ? <small> {t.note}</small> : null}</button>)}</div>}
      {q && suggestions.length === 0 && <p className={styles.help}>명단에서 찾을 수 없습니다. 이미 골랐거나, <b>대상자 명단</b> 탭에서 먼저 추가해 주세요.</p>}
    </div>
  );
}

function VisitsTab({ roster }: { roster: Target[] }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Visit | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const byId = useMemo(() => new Map(roster.map(t => [t.id, t])), [roster]);

  const reload = useCallback(async () => {
    try { const data = await call("/api/visits", "GET"); setVisits(data.visits as Visit[]); setError(""); }
    catch (e) { setError(errText(e, "일정을 불러오지 못했습니다.")); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setPicked(editing?.target_ids ?? []); }, [editing]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = { starts_at: fromInput(String(form.get("starts_at"))), kind: form.get("kind"), pastor: form.get("pastor") === "on", target_ids: picked, memo: form.get("memo") };
    setError(""); setNotice("");
    try {
      if (editing) await call("/api/visits", "PATCH", { id: editing.id, ...body }); else await call("/api/visits", "POST", body);
      setNotice(editing ? "수정했습니다." : "저장했습니다.");
      setEditing(null); setPicked([]); formElement.reset(); await reload();
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

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const shown = visits.filter(v => showPast || new Date(v.starts_at).getTime() >= cutoff);

  return (
    <>
      <form className={styles.card} onSubmit={save} key={editing ? `edit-${editing.id}` : "new"}>
        <h2>{editing ? "일정 수정" : "일정 추가"}</h2>
        <label>날짜와 시간<input name="starts_at" type="datetime-local" required defaultValue={editing ? toInput(editing.starts_at) : ""} /></label>
        <label>심방 종류<select name="kind" defaultValue={editing?.kind ?? "elder"}><option value="elder">장로 심방</option><option value="deacon">집사 심방</option></select></label>
        <label className={styles.check}><input name="pastor" type="checkbox" defaultChecked={editing?.pastor ?? false} /> 목사 동행 <small>(성도 화면에도 표시됩니다)</small></label>
        <TargetPicker roster={roster} value={picked} onChange={setPicked} />
        <label>메모 <small>(비공개)</small><textarea name="memo" rows={3} maxLength={2000} defaultValue={editing?.memo ?? ""} /></label>
        <div className={styles.row}><button className={styles.primary} type="submit">{editing ? "수정 저장" : "저장"}</button>{editing && <button type="button" onClick={() => setEditing(null)}>수정 취소</button>}</div>
        <p className={styles.help}>성도 화면에는 날짜·시간·종류·목사 동행만 나갑니다. 심방 대상자와 메모는 로그인한 직분자께만 보입니다. 심방을 마치면 아래 목록에서 <b>완료</b>를 눌러 주세요. 그러면 대상자가 '심방 현황'에서 완료로 바뀝니다.</p>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <div className={styles.listHead}><h2>일정 목록</h2><label className={styles.check}><input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} /> 지난 일정도 보기</label></div>
      {shown.length === 0 && <p className={styles.help}>표시할 일정이 없습니다.</p>}
      <ul className={styles.list}>
        {shown.map(v => (
          <li key={v.id} className={`${styles.item} ${v.status !== "scheduled" ? styles.dim : ""}`}>
            <div><strong>{kstShow.format(new Date(v.starts_at))}</strong> <span className={v.kind === "deacon" ? styles.deacon : styles.elder}>{v.kind === "deacon" ? "집사 심방" : "장로 심방"}</span>{v.pastor && <span className={styles.chip}>목사 동행</span>}<span className={styles.chip}>{statusLabel[v.status]}</span></div>
            <div className={styles.detail}>
              {v.target_ids.length > 0 && <span>심방 대상자: {v.target_ids.map(id => byId.get(id)?.name ?? "(삭제된 대상자)").join(", ")}</span>}
              {v.memo && <span>메모: {v.memo}</span>}
            </div>
            <div className={styles.row}>
              {v.status === "done" ? <button onClick={() => patch(v, { status: "scheduled" }, "예정으로 되돌렸습니다.")}>완료 취소</button> : <button onClick={() => patch(v, { status: "done" }, "완료로 표시했습니다.")}>완료</button>}
              {v.status === "cancelled" ? <button onClick={() => patch(v, { status: "scheduled" }, "예정으로 되돌렸습니다.")}>취소 해제</button> : <button onClick={() => patch(v, { status: "cancelled" }, "취소 처리했습니다. 성도 화면에서 사라집니다.")}>취소</button>}
              <button onClick={() => { setEditing(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
              <button onClick={() => remove(v)}>삭제</button>
              <span className={styles.hist}>
                <button type="button" aria-haspopup="true">최근 수정 {v.edits.length > 0 ? `(${v.edits.length})` : ""}</button>
                <span className={styles.pop} role="tooltip">
                  <strong>최근 수정한 분 (최대 10건)</strong>
                  {v.edits.length === 0 ? <em>기록이 없습니다.</em> : <ol>{v.edits.map((edit, index) => <li key={index}>{kstShort.format(new Date(edit.at))} · <b>{edit.name}</b> {edit.action}</li>)}</ol>}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProgressTab({ roster, rounds, reloadRounds }: { roster: Target[]; rounds: Round[]; reloadRounds: () => Promise<void> }) {
  const [roundId, setRoundId] = useState<number | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const today = kstDay.format(new Date());
  const round = rounds.find(r => r.id === roundId) ?? rounds.find(r => r.starts_on <= today && today <= r.ends_on) ?? rounds[0] ?? null;

  useEffect(() => {
    if (!round) { setVisits([]); return; }
    let alive = true;
    const from = `${round.starts_on}T00:00:00+09:00`, to = `${round.ends_on}T23:59:59+09:00`;
    call(`/api/visits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, "GET").then(d => { if (alive) setVisits(d.visits as Visit[]); }).catch(e => { if (alive) setError(errText(e, "일정을 불러오지 못했습니다.")); });
    return () => { alive = false; };
  }, [round?.id, round?.starts_on, round?.ends_on]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const done: Array<{ t: Target; at: string }> = [], planned: Array<{ t: Target; at: string }> = [], todo: Target[] = [];
    if (!round) return { done, planned, todo };
    const valid = visits.filter(v => v.status !== "cancelled" && kstDay.format(new Date(v.starts_at)) >= round.starts_on && kstDay.format(new Date(v.starts_at)) <= round.ends_on);
    for (const t of roster.filter(item => item.active && (!round.tag || (item.tags ?? []).includes(round.tag)))) {
      const related = valid.filter(v => v.target_ids.includes(t.id));
      const d = related.filter(v => v.status === "done").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
      const p = related.filter(v => v.status === "scheduled").sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
      if (d) done.push({ t, at: d.starts_at }); else if (p) planned.push({ t, at: p.starts_at }); else todo.push(t);
    }
    return { done, planned, todo };
  }, [round, visits, roster]);

  const allTags = useMemo(() => Array.from(new Set(roster.flatMap(t => t.tags ?? []))).sort(), [roster]);
  const total = groups.done.length + groups.planned.length + groups.todo.length;
  const pct = total ? Math.round((groups.done.length / total) * 100) : 0;

  async function createRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(""); setNotice("");
    try { await call("/api/visit-rounds", "POST", { title: form.get("title"), starts_on: form.get("starts_on"), ends_on: form.get("ends_on"), tag: form.get("tag") || null }); formElement.reset(); setNotice("심방 시기를 만들었습니다."); setRoundId(null); await reloadRounds(); }
    catch (e) { setError(errText(e, "저장하지 못했습니다.")); }
  }
  async function removeRound(r: Round) {
    if (!confirm(`'${r.title}' 시기를 삭제할까요? 일정은 지워지지 않습니다.`)) return;
    try { await call("/api/visit-rounds", "DELETE", { id: r.id }); setRoundId(null); await reloadRounds(); } catch (e) { setError(errText(e, "삭제하지 못했습니다.")); }
  }

  return (
    <>
      {round ? (
        <div className={styles.card}>
          <h2>이번 심방 현황{round.tag ? <small> · 대상: {round.tag}</small> : null}</h2>
          <label>심방 시기<select value={round.id} onChange={e => setRoundId(Number(e.target.value))}>{rounds.map(r => <option key={r.id} value={r.id}>{r.title}{r.tag ? ` · ${r.tag}` : ""} ({r.starts_on} ~ {r.ends_on})</option>)}</select></label>
          <p className={styles.sum}><b>완료 {groups.done.length}명</b> · 예정 {groups.planned.length}명 · 아직 {groups.todo.length}명 <small>(전체 {total}명)</small></p>
          <div className={styles.bar2} aria-label={`완료 ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
          <h3 className={styles.gTodo}>아직 심방하지 않음 ({groups.todo.length})</h3>
          {groups.todo.length === 0 ? <p className={styles.help}>모두 일정이 잡혔거나 완료되었습니다.</p> : <ul className={styles.names}>{groups.todo.map(t => <li key={t.id}>{t.name}</li>)}</ul>}
          <h3 className={styles.gPlan}>일정 예정 ({groups.planned.length})</h3>
          {groups.planned.length === 0 ? <p className={styles.help}>없음</p> : <ul className={styles.names}>{groups.planned.map(x => <li key={x.t.id}>{x.t.name} <small>{kstMD.format(new Date(x.at))}</small></li>)}</ul>}
          <h3 className={styles.gDone}>심방 완료 ({groups.done.length})</h3>
          {groups.done.length === 0 ? <p className={styles.help}>없음</p> : <ul className={styles.names}>{groups.done.map(x => <li key={x.t.id}>{x.t.name} <small>{kstMD.format(new Date(x.at))}</small></li>)}</ul>}
          <p className={styles.help}>일정에서 <b>완료</b>를 누르면 그 일정에 넣은 대상자가 완료로 바뀝니다. 명단에서 '사용 안 함'으로 둔 분은 계산에서 빠집니다.</p>
          <button type="button" onClick={() => removeRound(round)}>이 심방 시기 삭제</button>
        </div>
      ) : <div className={styles.card}><h2>심방 시기가 없습니다</h2><p className={styles.help}>아래에서 이번 심방 시기(예: 2026년 하반기 심방)를 먼저 만들어 주세요.</p></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <form className={styles.card} onSubmit={createRound}>
        <h2>새 심방 시기 만들기</h2>
        <label>이름<input name="title" maxLength={60} required placeholder="예: 2026년 하반기 심방" /></label>
        <label>대상 범위 <small>(명단의 분류. 예: 성찬 참여자만)</small><select name="tag" defaultValue=""><option value="">명단 전체</option>{allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></label>
        <label>시작일<input name="starts_on" type="date" required /></label>
        <label>종료일<input name="ends_on" type="date" required /></label>
        <button className={styles.primary} type="submit">만들기</button>
      </form>
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
  const shown = roster.filter(t => (showOff || t.active) && (!f || t.name.includes(f)) && (!tagFilter || (t.tags ?? []).includes(tagFilter)));

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const names = String(form.get("names") ?? "").split(/[,\n]/).map(n => n.trim()).filter(Boolean);
    setError(""); setNotice("");
    try {
      const data = await call("/api/visit-targets", "POST", { names, note: form.get("note"), tags: splitTags(newTags) });
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
      <form className={styles.card} onSubmit={add}>
        <h2>명단에 추가</h2>
        <label>이름 <small>(여러 명이면 줄을 바꾸거나 쉼표로 구분)</small><textarea name="names" rows={4} required placeholder={"김OO\n이OO\n박OO"} /></label>
        <label>분류 <small>(쉼표로 구분 · 예: 성찬 참여)</small><input value={newTags} onChange={e => setNewTags(e.target.value)} maxLength={120} placeholder="예: 성찬 참여" /></label>
        {allTags.length > 0 && <div className={styles.suggest}>{allTags.map(tag => <button type="button" key={tag} onClick={() => { const list = splitTags(newTags); if (!list.includes(tag)) setNewTags([...list, tag].join(", ")); }}>+ {tag}</button>)}</div>}
        <label>메모 <small>(비공개 · 한 명만 추가할 때)</small><input name="note" maxLength={500} placeholder="예: 가족 구성, 주의할 점" /></label>
        <button className={styles.primary} type="submit">추가</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <div className={styles.listHead}><h2>심방 대상자 명단 <small>({roster.filter(t => t.active).length}명)</small></h2><label className={styles.check}><input type="checkbox" checked={showOff} onChange={e => setShowOff(e.target.checked)} /> 사용 안 함도 보기</label></div>
      <label className={styles.search}><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="이름으로 찾기" aria-label="명단에서 찾기" />{allTags.length > 0 && <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} aria-label="분류로 보기"><option value="">모든 분류</option>{allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select>}</label>
      {shown.length === 0 && <p className={styles.help}>표시할 대상자가 없습니다.</p>}
      <ul className={styles.list}>
        {shown.map(t => (
          <li key={t.id} className={`${styles.item} ${t.active ? "" : styles.dim}`}>
            <div><strong>{t.name}</strong>{(t.tags ?? []).map(tag => <span key={tag} className={styles.chip}>{tag}</span>)}{!t.active && <span className={styles.chip}>사용 안 함</span>}</div>
            {t.note && <div className={styles.detail}><span>{t.note}</span></div>}
            <div className={styles.row}>
              <button onClick={() => { const name = prompt("이름을 바꿉니다", t.name); if (name && name.trim() && name.trim() !== t.name) patch(t, { name: name.trim() }, "이름을 바꿨습니다."); }}>이름 수정</button>
              <button onClick={() => { const text = prompt("분류를 쉼표로 구분해 입력하세요 (예: 성찬 참여). 비우면 모두 삭제", (t.tags ?? []).join(", ")); if (text !== null) patch(t, { tags: splitTags(text) }, "분류를 저장했습니다."); }}>분류</button>
              <button onClick={() => { const note = prompt("메모를 입력하세요 (비우면 삭제)", t.note ?? ""); if (note !== null) patch(t, { note }, "메모를 저장했습니다."); }}>메모</button>
              <button onClick={() => patch(t, { active: !t.active }, t.active ? "사용 안 함으로 보관했습니다." : "다시 사용합니다.")}>{t.active ? "사용 안 함" : "다시 사용"}</button>
            </div>
          </li>
        ))}
      </ul>
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

