"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "bot" | "user"; text: string; href?: string; linkLabel?: string };

const choices = ["예배 안내", "오시는 길", "교회소개", "신앙고백", "설교", "자료실"];

function replyFor(question: string): Message {
  const q = question.replace(/\s/g, "");
  if (/예배|시간|주일/.test(q)) return { role: "bot", text: "정확한 예배 시간은 교회 공식 문의 창구에서 확인해 주세요.", href: "https://www.facebook.com/DongSupSong/", linkLabel: "예배시간 문의하기 ↗" };
  if (/오시는|주소|위치|길|지도/.test(q)) return { role: "bot", text: "교회 주소는 전북특별자치도 전주시 덕진구 동가재미1길 6-4입니다.", href: "https://map.naver.com/p/search/%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4", linkLabel: "지도에서 보기 ↗" };
  if (/소개|역사|연혁|뿌리/.test(q)) return { role: "bot", text: "자유개혁교회의 소개와 우리의 뿌리를 확인할 수 있습니다.", href: "/about", linkLabel: "교회소개 보기 →" };
  if (/신앙|고백|벨직|하이델|도르트|일치|교리/.test(q)) return { role: "bot", text: "보편 신경과 벨직 신앙고백, 하이델베르크 교리문답, 도르트 신경을 소개하고 원문도 제공합니다.", href: "/church", linkLabel: "우리의 신앙고백 보기 →" };
  if (/설교|말씀|유튜브|영상/.test(q)) return { role: "bot", text: "주일예배 설교는 설교 게시판과 교회 공식 유튜브에서 확인할 수 있습니다.", href: "/sermons", linkLabel: "설교 보기 →" };
  if (/자료|시편|찬송|문서/.test(q)) return { role: "bot", text: "시편송, 찬송과 각 신앙고백 원문을 홈페이지에서 바로 읽을 수 있습니다.", href: "/resources", linkLabel: "자료실 열기 →" };
  if (/게시판|글쓰기|자유/.test(q)) return { role: "bot", text: "자유게시판에서 글을 남길 수 있으며, 관리자 확인 후 공개됩니다.", href: "/board", linkLabel: "자유게시판 열기 →" };
  return { role: "bot", text: "제가 안내할 수 있는 항목을 선택해 주세요. 자세한 문의는 교회 공식 문의 창구를 이용해 주세요.", href: "https://www.facebook.com/DongSupSong/", linkLabel: "교회에 문의하기 ↗" };
}

export function ChurchChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: "안녕하세요. 자유개혁교회 안내 도우미입니다. 무엇을 찾으시나요?" }]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const ask = (question: string) => {
    const value = question.trim();
    if (!value) return;
    setMessages(current => [...current, { role: "user", text: value }, replyFor(value)]);
    setInput("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  return <div className={`church-chat ${open ? "open" : ""}`}>
    {open && <section className="chat-panel" aria-label="교회 안내 챗봇">
      <header className="chat-head"><div><span>FRCK</span><strong>교회 안내 도우미</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="챗봇 닫기">×</button></header>
      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><p>{message.text}</p>{message.href && <a href={message.href} target={message.href.startsWith("http") ? "_blank" : undefined} rel={message.href.startsWith("http") ? "noreferrer" : undefined}>{message.linkLabel}</a>}</div>)}
      </div>
      <div className="chat-choices" aria-label="빠른 질문">{choices.map(choice => <button type="button" key={choice} onClick={() => ask(choice)}>{choice}</button>)}</div>
      <form className="chat-form" onSubmit={submit}><label className="sr-only" htmlFor="church-chat-input">질문 입력</label><input id="church-chat-input" value={input} onChange={event => setInput(event.target.value)} placeholder="궁금한 내용을 입력하세요" autoComplete="off" /><button type="submit" aria-label="질문 보내기">→</button></form>
      <small>자동 안내이므로 정확한 예배 일정은 교회에 확인해 주세요.</small>
    </section>}
    <button className="chat-toggle" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? "교회 안내 챗봇 닫기" : "교회 안내 챗봇 열기"}><span aria-hidden="true">{open ? "×" : "✦"}</span><strong>{open ? "닫기" : "교회 안내"}</strong></button>
  </div>;
}
