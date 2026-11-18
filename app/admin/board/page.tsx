import { SiteHeader, SubHero } from "../../components/site-shell";
import AdminClient from "./admin-client";
export const dynamic = "force-dynamic";
export default function AdminBoardPage(){return <main className="sub-page"><SiteHeader/><SubHero kicker="ADMIN" title="게시판 관리" description="접수된 글을 확인하고 승인하거나 삭제합니다."/><section className="content-section"><AdminClient/></section></main>}
