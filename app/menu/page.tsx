import type { Metadata } from "next";
import { NavLink } from "../components/nav-link";
import { SiteFooter, SiteHeader, SubHero } from "../components/site-shell";
import { siteNav } from "../site-nav";
import styles from "../site-menu.module.css";

export const metadata: Metadata = { title: "전체 메뉴" };

export default function MenuPage() {
  return (
    <main id="main" tabIndex={-1} className="sub-page">
      <SiteHeader />
      <SubHero kicker="SITE MENU" title="전체 메뉴" description="" />
      <div className={styles.menu}>
        {siteNav.map(group => (
          <section className={styles.group} key={group.id}>
            <h2>{group.label}</h2>
            <ul>
              {group.items.map(item => (
                <li key={item.href}>
                  {item.section && <h3 className={styles.subheading}>{item.section}</h3>}
                  <NavLink item={item} />
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <SiteFooter />
    </main>
  );
}
