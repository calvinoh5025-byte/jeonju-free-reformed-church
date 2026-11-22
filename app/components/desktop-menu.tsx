"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isSiteNavGroupCurrent, isSiteNavItemCurrent, siteNav } from "../site-nav";
import styles from "./desktop-menu.module.css";

export function DesktopMenu() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncHoverSupport = () => setHoverEnabled(query.matches);
    syncHoverSupport();
    query.addEventListener("change", syncHoverSupport);
    return () => query.removeEventListener("change", syncHoverSupport);
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
        if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !openGroup) return;
      event.preventDefault();
      buttonRefs.current.get(openGroup)?.focus();
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [openGroup]);

  return (
    <nav ref={rootRef} className={`desktop-nav ${styles.navigation}`} aria-label="주요 메뉴" onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpenGroup(null);
        if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
      }
    }}>
      {siteNav.map(group => {
        const expanded = openGroup === group.id;
        const current = isSiteNavGroupCurrent(pathname, group);
        const panelId = `desktop-navigation-${group.id}`;
        return (
          <div
            className={styles.group}
            key={group.id}
            onMouseEnter={() => {
              if (!hoverEnabled) return;
              if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
              setOpenGroup(group.id);
            }}
            onMouseLeave={() => {
              if (!hoverEnabled) return;
              hoverCloseTimer.current = setTimeout(() => {
                if (!rootRef.current?.contains(document.activeElement)) setOpenGroup(null);
              }, 150);
            }}
          >
            <button
              ref={node => { if (node) buttonRefs.current.set(group.id, node); }}
              type="button"
              className={`${styles.groupButton} ${current ? styles.currentGroup : ""}`}
              aria-expanded={expanded}
              aria-controls={panelId}
              aria-current={current ? "location" : undefined}
              onClick={() => setOpenGroup(value => value === group.id ? null : group.id)}
            >
              {group.label}<span aria-hidden="true" className={styles.chevron}>⌄</span>
            </button>
            <div className={styles.panel} id={panelId} hidden={!expanded}>
                {group.items.map(item => {
                  const itemCurrent = isSiteNavItemCurrent(pathname, item.href);
                  return <Link key={item.href} href={item.href} className={styles.item} aria-current={itemCurrent ? "page" : undefined} onClick={() => setOpenGroup(null)}>{item.label}</Link>;
                })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
