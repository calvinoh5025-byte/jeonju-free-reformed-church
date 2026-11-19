"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./mobile-menu.module.css";

const nav = [
  ["교회소개", "/about"],
  ["새가족 안내", "/newcomers"],
  ["개혁교회 신앙고백서", "/church"],
  ["예배생활", "/worship"],
  ["설교", "/sermons"],
  ["자유게시판", "/board"],
  ["자료실", "/resources"],
  ["오시는 길", "/location"],
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("touchstart", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("touchstart", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <div className={`mobile-menu ${styles.root}`} ref={menuRef}>
      <button
        className={styles.button}
        type="button"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(value => !value)}
      >
        메뉴
      </button>
      {open && (
        <nav className={styles.panel} id="mobile-navigation" aria-label="모바일 주요 메뉴">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
