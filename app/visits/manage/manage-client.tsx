"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "./manage.module.css";

type User = { email: string; name: string; role: "admin" | "elder" | "deacon" };
type Visit = { id: number; starts_at: string; kind: "elder" | "deacon"; pastor: boolean; status: "scheduled" | "done" | "cancelled"; mine: boolean; household: string | null; elder_name: string | null; memo: string | null };
type Staff = { id: number; email: string; name: string; role: "elder" | "deacon"; active: boolean };

const roleLabel = { admin: "관리자", elder: "장로·목사", deacon: "집사" } as const;
const statusLabel = { scheduled: "예정", done: "완료", cancelled: "취소" } as const;
const kstInput = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const kstShow = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const toInput = (iso: string) => kstInput.format(new Date(iso)).replace(" ", "T");
const fromInput = (value: string) => `${value}:00+09:00`;

async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "처리하지 못했습니다.");
  return data as Record<string, unknown>;
}

export function ManageClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => { call("/api/visit-auth", "GET").then(data => setUser((data.user as User | null) ?? null)).catch(() => setUser(null)); }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try { const data = await call("/api/visit-auth", "POST", { email: form.get("email"), password: form.get("password") }); setUser(data.user as User); }
    catch (e) { setError(e instanceof Error ? e.message : "로그인하지 못했습니다."); }
  }
  async function logout() { await call("/api/visit-auth", "DELETE").catch(() => null); setUser(null); }

  if (user === undefined) return <section className={styles.wrap}><p>불러오는 중입니다…</p></section>;
  if (!user) return (
    <section className={styles.wrap}>
      <form className={styles.card} onSubmit={login}>
        <h2>로그인</h2>
        <p className={styles.help}>관리자가 등록한 장로·집사님만 로그인할 수 있습니다. 회원가입은 없습니다.</p>
        <label>이메일<input name="email" type="email" autoComplete="username" required /></label>
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
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Visit | null>(null);
  const [showPast, setShowPast] = useState(false);

  const reload = useCallback(async () => {
    try { const data = await call("/api/visits", "GET"); setVisits(data.visits as Visit[]); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "일정을 불러오지 못했습니다."); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      starts_at: fromInput(String(form.get("starts_at"))), pastor: form.get("pastor") === "on",
      household: form.get("household"), elder_name: form.get("elder_name"), memo: form.get("memo"),
    };
    if (user.role !== "deacon") body.kind = form.get("kind");
    setError(""); setNotice("");
    try {
      if (editing) await call("/api/visits", "PATCH", { id: editing.id, ...body });
      else await call("/api/visits", "POST", body);
      setNotice(editing ? "수정했습니다." : "저장했습니다.");
      setEditing(null); (event.target as HTMLFormElement).reset(); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
  }
  async function patch(visit: Visit, fields: Record<string, unknown>, message: string) {
    setError(""); setNotice("");
    try { await call("/api/visits", "PATCH", { id: visit.id, ...fields }); setNotice(message); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); }
  }
  async function remove(visit: Visit) {
    if (!confirm("이 일정을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setError(""); setNotice("");
    try { await call("/api/visits", "DELETE", { id: visit.id }); setNotice("삭제했습니다."); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const shown = visits.filter(v => showPast || new Date(v.starts_at).getTime() >= cutoff);
  const formKey = editing ? `edit-${editing.id}` : "new";

  return (
    <section className={styles.wrap}>
      <div className={styles.bar}><span>{user.name}님 · {roleLabel[user.role]}</span><span><Link href="/visits">달력 보기</Link> <button onClick={onLogout}>로그아웃</button></span></div>
      <form className={styles.card} onSubmit={save} key={formKey}>
        <h2>{editing ? "일정 수정" : "일정 추가"}</h2>
        <label>날짜와 시간<input name="starts_at" type="datetime-local" required defaultValue={editing ? toInput(editing.starts_at) : ""} /></label>
        {user.role !== "deacon" && <label>심방 종류<select name="kind" defaultValue={editing?.kind ?? "elder"}><option value="elder">장로 심방</option><option value="deacon">집사 심방</option></select></label>}
        <label className={styles.check}><input name="pastor" type="checkbox" defaultChecked={editing?.pastor ?? false} /> 목사 동행 <small>(성도 화면에도 표시됩니다)</small></label>
        <label>가정 이름 <small>(비공개)</small><input name="household" maxLength={100} defaultValue={editing?.household ?? ""} /></label>
        <label>담당 장로·집사 <small>(비공개)</small><input name="elder_name" maxLength={100} defaultValue={editing?.elder_name ?? ""} /></label>
        <label>메모 <small>(비공개)</small><textarea name="memo" rows={3} maxLength={2000} defaultValue={editing?.memo ?? ""} /></label>
        <div className={styles.row}><button className={styles.primary} type="submit">{editing ? "수정 저장" : "저장"}</button>{editing && <button type="button" onClick={() => setEditing(null)}>수정 취소</button>}</div>
        <p className={styles.help}>성도 화면에는 날짜·시간·종류·목사 동행만 나갑니다. 가정 이름, 담당, 메모는 로그인한 분께만 보입니다.</p>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <div className={styles.listHead}><h2>일정 목록</h2><label className={styles.check}><input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} /> 지난 일정도 보기</label></div>
      {shown.length === 0 && <p className={styles.help}>표시할 일정이 없습니다.</p>}
      <ul className={styles.list}>
        {shown.map(v => (
          <li key={v.id} className={`${styles.item} ${v.status !== "scheduled" ? styles.dim : ""}`}>
            <div><strong>{kstShow.format(new Date(v.starts_at))}</strong> <span className={v.kind === "deacon" ? styles.deacon : styles.elder}>{v.kind === "deacon" ? "집사 심방" : "장로 심방"}</span>{v.pastor && <span className={styles.chip}>목사 동행</span>}<span className={styles.chip}>{statusLabel[v.status]}</span></div>
            {v.mine ? <div className={styles.detail}>{v.household && <span>가정: {v.household}</span>}{v.elder_name && <span>담당: {v.elder_name}</span>}{v.memo && <span>메모: {v.memo}</span>}</div> : <div className={styles.detail}><small>다른 분이 넣은 일정이라 상세는 보이지 않습니다.</small></div>}
            {v.mine && <div className={styles.row}>
              {v.status === "done" ? <button onClick={() => patch(v, { status: "scheduled" }, "예정으로 되돌렸습니다.")}>완료 취소</button> : <button onClick={() => patch(v, { status: "done" }, "완료로 표시했습니다.")}>완료</button>}
              {v.status === "cancelled" ? <button onClick={() => patch(v, { status: "scheduled" }, "예정으로 되돌렸습니다.")}>취소 해제</button> : <button onClick={() => patch(v, { status: "cancelled" }, "취소 처리했습니다. 성도 화면에서 사라집니다.")}>취소</button>}
              <button onClick={() => { setEditing(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
              <button onClick={() => remove(v)}>삭제</button>
            </div>}
          </li>
        ))}
      </ul>
      {user.role === "admin" && <StaffAdmin />}
    </section>
  );
}

function StaffAdmin() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reload = useCallback(async () => {
    try { const data = await call("/api/visit-staff", "GET"); setStaff(data.staff as Staff[]); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "계정 목록을 불러오지 못했습니다."); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(""); setNotice("");
    try { await call("/api/visit-staff", "POST", { email: form.get("email"), name: form.get("name"), role: form.get("role"), password: form.get("password") }); setNotice("계정을 만들었습니다. 이메일과 비밀번호를 본인께 직접 알려 주세요."); (event.target as HTMLFormElement).reset(); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "계정을 만들지 못했습니다."); }
  }
  async function act(fn: () => Promise<unknown>, message: string) {
    setError(""); setNotice("");
    try { await fn(); setNotice(message); await reload(); } catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); }
  }
  return (
    <div className={styles.admin}>
      <h2>장로·집사 계정 관리 <small>(관리자 전용)</small></h2>
      <form className={styles.card} onSubmit={add}>
        <label>이메일<input name="email" type="email" required /></label>
        <label>이름<input name="name" maxLength={50} required /></label>
        <label>역할<select name="role" defaultValue="elder"><option value="elder">장로·목사 (모든 일정 상세 보기)</option><option value="deacon">집사 (자기 일정만 상세 보기)</option></select></label>
        <label>처음 비밀번호 <small>(8자 이상, 본인께 알려 주세요)</small><input name="password" type="text" minLength={8} maxLength={100} required autoComplete="off" /></label>
        <button className={styles.primary} type="submit">계정 만들기</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <ul className={styles.list}>
        {staff.map(s => (
          <li key={s.id} className={`${styles.item} ${s.active ? "" : styles.dim}`}>
            <div><strong>{s.name}</strong> <span className={styles.chip}>{roleLabel[s.role]}</span>{!s.active && <span className={styles.chip}>사용 중지</span>}</div>
            <div className={styles.detail}><span>{s.email}</span></div>
            <div className={styles.row}>
              <button onClick={() => act(() => call("/api/visit-staff", "PATCH", { id: s.id, active: !s.active }), s.active ? "로그인을 막았습니다." : "다시 사용할 수 있게 했습니다.")}>{s.active ? "사용 중지" : "다시 사용"}</button>
              <button onClick={() => { const password = prompt("새 비밀번호를 입력하세요 (8자 이상)"); if (password) act(() => call("/api/visit-staff", "PATCH", { id: s.id, password }), "비밀번호를 바꿨습니다. 본인께 알려 주세요."); }}>비밀번호 변경</button>
              <button onClick={() => { if (confirm(`${s.name} 계정을 삭제할까요?`)) act(() => call("/api/visit-staff", "DELETE", { id: s.id }), "계정을 삭제했습니다."); }}>삭제</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
