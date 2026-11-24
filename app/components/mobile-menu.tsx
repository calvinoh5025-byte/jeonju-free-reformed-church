"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isSiteNavGroupCurrent, isSiteNavItemCurrent, siteNav } from "../site-nav";
import { NavLink } from "./nav-link";
import styles from "./mobile-menu.module.css";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setOpenGroup(null);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || (!open && !openGroup)) return;
      setOpen(false);
      setOpenGroup(null);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("touchstart", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("touchstart", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open, openGroup]);

  return (
    <div className={`mobile-menu ${styles.root}`} ref={menuRef}>
      <button
        className={styles.button}
        ref={buttonRef}
        type="button"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => {
          setOpen(value => !value);
          setOpenGroup(null);
        }}
      >
        메뉴
      </button>
      {open && (
        <nav className={styles.panel} id="mobile-navigation" aria-label="모바일 주요 메뉴">
          {siteNav.map(group => {
            const expanded = openGroup === group.id;
            const current = isSiteNavGroupCurrent(pathname, group);
            const panelId = `mobile-navigation-${group.id}`;
            return <section className={styles.group} key={group.id}>
              <button
                className={`${styles.groupButton} ${current ? styles.currentGroup : ""}`}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-current={current ? "location" : undefined}
                onClick={() => setOpenGroup(value => value === group.id ? null : group.id)}
              >
                {group.label}<span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              <ul id={panelId} className={styles.items} hidden={!expanded}>
                {group.items.map(item => <li key={item.href}>
                  {item.section && <p className={styles.subheading}>{item.section}</p>}
                  <NavLink item={item} current={isSiteNavItemCurrent(pathname, item.href)} onClick={() => { setOpen(false); setOpenGroup(null); }} />
                </li>)}
              </ul>
            </section>;
          })}
        </nav>
      )}
    </div>
  );
}
