export type SiteNavItem = {
  label: string;
  href: string;
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
      { label: "교회소개", href: "/about" },
      { label: "새가족 안내", href: "/newcomers" },
      { label: "오시는 길", href: "/location" },
    ],
  },
  {
    id: "worship",
    label: "예배와 설교",
    items: [
      { label: "주보", href: "/worship/bulletin" },
      { label: "예배순서", href: "/worship/order" },
      { label: "설교", href: "/sermons" },
      { label: "설교 번역", href: "/guide/index.html#sermons" },
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
      { label: "성경읽기", href: "/worship/bible" },
    ],
  },
  {
    id: "confession-order",
    label: "신앙고백과 교회질서",
    items: [
      { label: "신앙고백서 전체 보기", href: "/church" },
      { label: "벨직 신앙고백서", href: "/confessions/belgic" },
      { label: "하이델베르크 교리문답", href: "/confessions/heidelberg" },
      { label: "돌트 신경", href: "/confessions/dort" },
      { label: "보편 신경", href: "/confessions/universal-creeds" },
      { label: "교회질서", href: "/resources/read/church-order" },
      { label: "동의서약서", href: "/worship/subscription" },
    ],
  },
  {
    id: "news-resources",
    label: "소식·자료",
    items: [
      { label: "공지게시판", href: "/board" },
      { label: "자유게시판", href: "/free-board" },
      { label: "자료실", href: "/resources" },
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
