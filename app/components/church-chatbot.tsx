"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { address, contact, postalCode, worshipTimes } from "../church-info";

type Link = { href: string; label: string };
type Message = { role: "bot" | "user"; text: string; links?: Link[] };
type Topic = { keys: [string, number][]; text: string; links?: Link[] };

const choices = ["예배 안내", "새가족 안내", "오시는 길", "문의", "신앙고백", "설교·번역", "자료실", "게시판"];

const naverMap = "https://map.naver.com/p/search/%EC%A0%84%EC%A3%BC%EC%8B%9C%20%EB%8D%95%EC%A7%84%EA%B5%AC%20%EB%8F%99%EA%B0%80%EC%9E%AC%EB%AF%B81%EA%B8%B8%206-4";
const phoneLink: Link = { href: contact.phoneHref, label: `전화 걸기 ${contact.phone}` };
const confirmNote = `구체적인 내용과 일정은 교회에 직접 확인해 주세요. 전화 ${contact.phone}, 이메일 ${contact.email}으로 문의하실 수 있습니다.`;

// 키워드마다 점수를 줍니다. 더 구체적인 말일수록 높은 점수를 주어 먼저 안내합니다.
const topics: Topic[] = [
  { keys: [["하이델베르크", 9], ["교리문답", 7], ["52주", 8], ["위로", 3]],
    text: "하이델베르크 교리문답은 신앙의 핵심을 질문과 대답으로 가르치는 책으로, 52주일로 구성되어 있습니다.\n캐나다에 있는 개혁교회는 주일 두 차례 예배를 드리고, 보통 한 예배에서는 하이델베르크 교리문답을 따라 성경의 교리를 설교합니다. 성경이 가르치는 구원의 내용을 차근차근 배우도록 돕는 방식입니다. 구체적인 운영은 지역교회에 확인하시면 됩니다.\n새가족께는 1문부터 함께 읽어 보기를 권합니다.",
    links: [{ href: "/resources/read/heidelberg", label: "하이델베르크 교리문답 읽기 →" }, { href: "/church", label: "우리의 신앙고백 →" }] },
  { keys: [["벨직", 9], ["신앙고백서", 7]],
    text: "벨직 신앙고백서는 세일치신조의 하나로, 개혁교회의 첫 번째 교리 표준 문서입니다. 우리 교회는 이 문서를 고백합니다.",
    links: [{ href: "/resources/read/belgic", label: "벨직 신앙고백서 읽기 →" }, { href: "/church", label: "우리의 신앙고백 →" }] },
  { keys: [["돌트", 9], ["도르트", 9], ["항론파", 8]],
    text: "돌트 신경은 항론파에 반대하여 정리한 다섯 조항의 문서로, 세일치신조의 하나입니다. 우리 교회는 이 문서를 고백합니다.",
    links: [{ href: "/resources/read/dort", label: "돌트 신경 읽기 →" }, { href: "/church", label: "우리의 신앙고백 →" }] },
  { keys: [["사도신경", 9], ["니케아", 9], ["아타나시우스", 9], ["보편", 8], ["신경", 3]],
    text: "사도신경, 니케아 신경, 아타나시우스 신경을 보편 신경이라 부르며, 우리 교회는 이를 받아들입니다. 자료실에서 원문을 읽을 수 있습니다.",
    links: [{ href: "/resources/read/universal-creeds", label: "보편 신경 읽기 →" }, { href: "/church", label: "우리의 신앙고백 →" }] },
  { keys: [["세일치", 9], ["세일치신조", 9], ["일치신조", 9], ["신앙고백", 6], ["고백", 3], ["신조", 5], ["교리", 4], ["믿는", 3], ["믿음", 2]],
    text: "전주자유개혁교회는 세일치신조인 벨직 신앙고백, 하이델베르크 교리문답, 돌트 신경을 고백하며, 보편 신경을 받아들입니다. 이 문서들은 성경이 가르치는 바를 요약하여 배우고 함께 고백하도록 돕습니다.\n세 문서의 항목별 대조표도 자료실에 있습니다.",
    links: [{ href: "/church", label: "우리의 신앙고백 보기 →" }, { href: "/resources/read/three-forms-comparison", label: "세 일치 신조 대조표 →" }] },
  { keys: [["개혁교회", 7], ["개혁", 5], ["뿌리", 7], ["역사", 4], ["연혁", 5], ["소개", 4], ["어떤교회", 6], ["캐나다", 6], ["호주", 6], ["화란", 6], ["네덜란드", 6], ["자유개혁", 6]],
    text: "전주자유개혁교회는 대한민국 전주에 있는 자유개혁교회입니다. 우리는 캐나다·호주·화란(네덜란드) 등의 개혁교회 전통을 잇고 있습니다.\n‘개혁’은 교회가 하나님의 말씀인 성경으로 믿음과 생활을 계속 살피고 바로잡아야 한다는 뜻입니다. 목회자나 교회의 전통도 성경보다 높은 권위를 갖지 않습니다.",
    links: [{ href: "/about", label: "교회소개 보기 →" }, { href: "/newcomers", label: "새가족 안내 →" }] },
  { keys: [["세례", 9], ["유아세례", 10], ["성찬", 9], ["언약", 8], ["권징", 8], ["직분", 7], ["목사", 6], ["장로", 6], ["집사", 6], ["등록", 7], ["이명", 7], ["교인", 5], ["교회에속", 6]],
    text: "세례, 성찬, 언약, 권징, 직분과 교회 등록 같은 내용은 교회가 성경과 신앙고백에 따라 신중하게 안내합니다. 홈페이지의 새가족 안내에 기본 설명이 있습니다.\n구체적인 일정과 절차는 이곳에서 임의로 안내해 드릴 수 없으니 교회에 직접 확인해 주세요. " + confirmNote,
    links: [{ href: "/newcomers", label: "새가족 안내 읽기 →" }, { href: "/resources/read/liturgical-forms", label: "예전예식서 (문서) →" }] },
  { keys: [["교회질서", 9], ["서약", 7], ["동의서", 8]],
    text: "교회질서와 동의 서약서는 교회가 함께 지키는 질서와 직분자의 서약을 담은 문서입니다. 자료실에서 문서로 읽을 수 있습니다. 실제 적용에 관한 질문은 교회에 확인해 주세요.",
    links: [{ href: "/resources/read/church-order", label: "교회질서 읽기 →" }, { href: "/resources/read/subscription", label: "동의 서약서 →" }] },
  { keys: [["예전", 8], ["예식서", 9], ["기도문", 9]],
    text: "예전예식서와 기도문은 개혁교회의 공예배와 예식을 위한 문서입니다. 자료실에서 읽을 수 있습니다.",
    links: [{ href: "/resources/read/liturgical-forms", label: "예전예식서 읽기 →" }, { href: "/resources/read/prayers", label: "기도문 읽기 →" }] },
  { keys: [["새가족", 10], ["처음", 6], ["방문", 7], ["등록", 3], ["초보", 5], ["낯설", 6], ["교회가처음", 8], ["환영", 5]],
    text: "처음 오신 분도, 다른 교회에서 오신 분도 환영합니다. 예배 순서나 신앙의 표현이 낯설 수 있지만 모든 것을 미리 알고 오실 필요는 없습니다. 말씀을 듣고, 궁금한 것을 물으며, 함께 배워 가시기 바랍니다.\n예배 시간은 " + worshipTimes.map(item => `${item.label} ${item.time}`).join(", ") + "입니다.",
    links: [{ href: "/newcomers", label: "새가족 안내 읽기 →" }, { href: "/location", label: "오시는 길 →" }] },
  { keys: [["예배순서", 10], ["순서", 5], ["찬송순서", 6], ["시편찬송", 5], ["예배는", 3]],
    text: "예배는 하나님께서 말씀으로 우리를 만나 주시고, 우리가 믿음과 찬양과 기도로 응답하는 자리입니다. 성경을 읽고 설교를 들으며, 함께 기도하고 시편찬송을 부릅니다.\n오전·오후 공예배 순서는 자료실의 예배순서에서 볼 수 있습니다. 순서와 자녀 동반 등 궁금한 점은 교회에 문의해 주세요.",
    links: [{ href: "/resources/read/worship-order", label: "예배순서 보기 →" }, { href: "/newcomers", label: "새가족 안내 →" }] },
  { keys: [["예배", 7], ["시간", 6], ["주일", 6], ["몇시", 7], ["오전", 4], ["오후", 4], ["언제", 5]],
    text: worshipTimes.map(item => `${item.label}: ${item.time}`).join("\n") + "\n예배는 하나님께서 말씀으로 우리를 만나 주시고, 우리가 믿음과 찬양과 기도로 응답하는 자리입니다. 정확한 일정은 교회에 확인해 주세요.",
    links: [{ href: "/resources/read/worship-order", label: "예배순서 보기 →" }, { href: "/location", label: "오시는 길 →" }] },
  { keys: [["오시는", 9], ["주소", 9], ["위치", 8], ["지도", 8], ["찾아", 6], ["어디", 5], ["우편번호", 9], ["길", 2], ["가는법", 8], ["네비", 6]],
    text: `교회 주소는 ${address} (우편번호 ${postalCode})입니다.\n지도와 자세한 안내는 오시는 길 페이지에서 볼 수 있습니다.`,
    links: [{ href: "/location", label: "오시는 길 보기 →" }, { href: naverMap, label: "네이버 지도에서 보기 ↗" }] },
  { keys: [["문의", 8], ["연락", 8], ["전화", 8], ["이메일", 8], ["메일", 6], ["번호", 5], ["페이스북", 8], ["sns", 5], ["공식", 4]],
    text: `전화 ${contact.phone}\n이메일 ${contact.email}\n교회 공식 페이스북 페이지에서도 소식을 볼 수 있습니다.`,
    links: [phoneLink, { href: contact.facebook, label: "교회 페이스북 ↗" }] },
  { keys: [["클라리온", 9], ["clarion", 9], ["잡지", 8], ["번역", 7], ["theseed", 9], ["더씨드", 8]],
    text: "자유개혁교회 자료실에서 TheSeed 설교와 Clarion 잡지 PDF를 한국어로 번역해 읽을 수 있습니다.",
    links: [{ href: "/guide/index.html#sermons", label: "설교 번역 읽기 →" }, { href: "/guide/index.html#clarion", label: "Clarion 번역 읽기 →" }] },
  { keys: [["설교", 8], ["말씀", 5], ["유튜브", 7], ["영상", 6], ["다시보기", 7], ["들을", 4]],
    text: "주일예배 설교는 설교 게시판과 교회 공식 유튜브에서 확인할 수 있습니다. TheSeed 설교와 Clarion 잡지는 한국어 번역으로도 읽을 수 있습니다.",
    links: [{ href: "/sermons", label: "설교 보기 →" }, { href: "/guide/index.html#sermons", label: "설교 번역 읽기 →" }] },
  { keys: [["시편송", 9], ["시편", 7], ["찬송", 7], ["악보", 6], ["자료", 6], ["문서", 5], ["원문", 5], ["읽을", 3]],
    text: "자료실에서 시편송(1~150편), 찬송, 보편 신경, 벨직 신앙고백서, 하이델베르크 교리문답, 돌트 신경, 기도문, 교회질서, 동의 서약서, 예전예식서, 세 일치 신조 대조표, 예배순서를 바로 읽을 수 있습니다.",
    links: [{ href: "/resources", label: "자료실 열기 →" }, { href: "/resources/read/psalms", label: "시편송 →" }] },
  { keys: [["게시판", 9], ["글쓰기", 9], ["글남", 8], ["자유", 4], ["댓글", 5], ["작성", 5]],
    text: "자유게시판에서 글을 남길 수 있습니다. 남기신 글은 관리자가 확인한 뒤 공개됩니다. 개인정보나 연락처는 글에 적지 않도록 주의해 주세요.",
    links: [{ href: "/board", label: "자유게시판 열기 →" }] },
  { keys: [["안녕", 8], ["하이", 5], ["반갑", 7], ["처음뵙", 7]],
    text: "안녕하세요. 전주자유개혁교회 안내 도우미입니다. 예배 시간, 새가족 안내, 오시는 길, 신앙고백, 설교와 자료실 등을 안내해 드립니다. 궁금한 것을 편하게 물어보세요." },
  { keys: [["감사", 9], ["고마", 9], ["수고", 6]],
    text: "도움이 되었다면 기쁩니다. 더 궁금한 점이 있으면 언제든 물어보세요. 예배에서 뵙기를 바랍니다." },
];

function replyFor(question: string): Message {
  const q = question.toLowerCase().replace(/[\s?!.,~]/g, "");
  let best: Topic | undefined;
  let bestScore = 0;
  for (const topic of topics) {
    const score = topic.keys.reduce((sum, [key, weight]) => sum + (q.includes(key) ? weight : 0), 0);
    if (score > bestScore) { best = topic; bestScore = score; }
  }
  if (best && bestScore >= 3) return { role: "bot", text: best.text, links: best.links };
  return {
    role: "bot",
    text: `질문을 정확히 이해하지 못했습니다. 이렇게 물어보실 수 있습니다.\n· 예배 시간이 어떻게 되나요?\n· 처음 가는데 어떻게 하나요?\n· 오시는 길을 알려주세요\n· 하이델베르크 교리문답이 뭔가요?\n· 설교는 어디서 보나요?\n자세한 문의는 전화 ${contact.phone}으로 해 주세요.`,
    links: [phoneLink, { href: "/newcomers", label: "새가족 안내 →" }],
  };
}

export function ChurchChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: "안녕하세요. 전주자유개혁교회 안내 도우미입니다. 예배, 새가족, 오시는 길, 신앙고백, 설교 등 궁금한 것을 물어보세요." }]);
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
        {messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><p style={{ whiteSpace: "pre-line" }}>{message.text}</p>{message.links?.map(link => <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>{link.label}</a>)}</div>)}
      </div>
      <div className="chat-choices" aria-label="빠른 질문">{choices.map(choice => <button type="button" key={choice} onClick={() => ask(choice)}>{choice}</button>)}</div>
      <form className="chat-form" onSubmit={submit}><label className="sr-only" htmlFor="church-chat-input">질문 입력</label><input id="church-chat-input" value={input} onChange={event => setInput(event.target.value)} placeholder="궁금한 내용을 입력하세요" autoComplete="off" /><button type="submit" aria-label="질문 보내기">→</button></form>
      <small>자동 안내이므로 정확한 예배 일정은 교회에 확인해 주세요.</small>
    </section>}
    <button className="chat-toggle" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? "교회 안내 챗봇 닫기" : "교회 안내 챗봇 열기"}><span aria-hidden="true">{open ? "×" : "✦"}</span><strong>{open ? "닫기" : "교회 안내"}</strong></button>
  </div>;
}
