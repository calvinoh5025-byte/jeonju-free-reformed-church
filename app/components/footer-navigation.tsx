import Link from "next/link";
import { siteNav } from "../site-nav";
import styles from "./footer-navigation.module.css";

export function FooterNavigation({ includeMenuLink = false }: { includeMenuLink?: boolean }) {
  return <nav className={styles.navigation} aria-label="전체 메뉴">
    {siteNav.map(group => <section className={styles.group} key={group.id}>
      <h2>{group.label}</h2>
      <ul>{group.items.map(item => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul>
    </section>)}
    {includeMenuLink && <p className={styles.allMenu}><Link href="/menu">전체 메뉴 보기</Link></p>}
  </nav>;
}
