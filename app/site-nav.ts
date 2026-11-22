export type SiteNavItem = {
  label: string;
  href: string;
  description?: string;
};

export type SiteNavGroup = {
  id: string;
  label: string;
  items: SiteNavItem[];
};

export const siteNav: SiteNavGroup[] = [
  {
    id: "church",
    label: "교회 소개",
    items: [
      { label: "교회소개", href: "/about", description: "말씀과 신앙고백 위에 서서 언약 안에서 함께 자라가는 개혁교회입니다." },
      { label: "새가족 안내", href: "/newcomers", description: "처음 오신 여러분을 환영합니다." },
      { label: "오시는 길", href: "/location", description: "자유개혁교회로 오시는 길을 안내합니다." },
    ],
  },
  {
    id: "worship",
    label: "예배와 설교",
    items: [
      { label: "주보", href: "/worship/bulletin" },
      { label: "예배순서", href: "/worship/order" },
      { label: "설교", href: "/sermons", description: "주일 오전·오후예배 설교를 공식 유튜브 채널에서 다시 들을 수 있습니다." },
      { label: "설교 번역", href: "/guide/index.html#sermons", description: "자유개혁교회 자료실에서 TheSeed 설교를 한국어로 번역해 읽을 수 있습니다." },
    ],
  },
  {
    id: "worship-materials",
    label: "예배 자료",
    items: [
      { label: "예배생활 전체 보기", href: "/worship" },
      { label: "시편", href: "/worship/psalms" },
      { label: "찬송", href: "/worship/hymns" },
      { label: "기도문", href: "/worship/prayers" },
      { label: "예전예식서", href: "/worship/liturgy" },
      { label: "성경읽기", href: "/worship/bible", description: "개역한글판 성경을 책과 장을 골라 읽을 수 있습니다." },
    ],
  },
  {
    id: "confession-order",
    label: "신앙고백과 교회질서",
    items: [
      { label: "신앙고백서 전체 보기", href: "/church", description: "자유개혁교회는 성경을 유일하고 충분한 신앙의 규범으로 받으며, 보편 신경과 세 일치 신조를 함께 고백합니다." },
      { label: "벨직 신앙고백서", href: "/confessions/belgic", description: "항별로 읽습니다." },
      { label: "하이델베르크 교리문답", href: "/confessions/heidelberg", description: "주일별 문답을 읽습니다." },
      { label: "돌트 신경", href: "/confessions/dort", description: "교리별로 읽습니다." },
      { label: "보편 신경", href: "/confessions/universal-creeds", description: "사도신경, 니케아 신경, 아타나시우스 신경을 선택해 읽습니다." },
      { label: "교회질서", href: "/resources/read/church-order" },
      { label: "동의서약서", href: "/worship/subscription" },
    ],
  },
  {
    id: "news-resources",
    label: "소식·자료",
    items: [
      { label: "공지게시판", href: "/board", description: "교회 공지사항을 확인할 수 있습니다." },
      { label: "자유게시판", href: "/free-board", description: "교회와 이웃이 따뜻한 소식과 이야기를 나누는 공간입니다. 작성한 글은 바로 공개됩니다." },
      { label: "자료실", href: "/resources", description: "개혁교회 설교 자료와 클라리온 잡지를 한국어로 읽을 수 있습니다." },
    ],
  },
];

export function isSiteNavItemCurrent(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/worship" || href === "/church") return false;
  return pathname.startsWith(`${href}/`);
}

export function isSiteNavGroupCurrent(pathname: string, group: SiteNavGroup) {
  return group.items.some(item => isSiteNavItemCurrent(pathname, item.href));
}
