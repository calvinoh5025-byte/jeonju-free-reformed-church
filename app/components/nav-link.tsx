import Link from "next/link";
import type { SiteNavItem } from "../site-nav";

type NavLinkProps = {
  item: SiteNavItem;
  className?: string;
  current?: boolean;
  onClick?: () => void;
};

/** 메뉴 항목 하나를 링크로 그립니다. 교회 사이트 밖 주소는 새 창으로 열고 ↗ 를 붙입니다. */
export function NavLink({ item, className, current, onClick }: NavLinkProps) {
  if (item.external) {
    return (
      <a
        href={item.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.label} (새 창에서 열림)`}
        onClick={onClick}
      >
        {item.label}<span aria-hidden="true">&nbsp;↗</span>
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} aria-current={current ? "page" : undefined} onClick={onClick}>
      {item.label}
    </Link>
  );
}
