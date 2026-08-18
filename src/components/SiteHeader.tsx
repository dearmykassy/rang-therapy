import Link from "@/components/SiteLink";
import { RegionSearch } from "@/components/RegionSearch";
import { PHONE_HREF } from "@/lib/business";

const NAV = [
  ["/areas/", "지역 안내"],
  ["/pricing/", "가격 안내"],
  ["/guide/", "이용 안내"],
  ["/notice/", "공지사항"],
  ["/blog/", "블로그"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-row">
        <Link className="logo" href="/" aria-label="랑테라피 홈">
          <img className="logo-mark" src="/rang-therapy-mark.svg" alt="" width="38" height="38" aria-hidden="true" />
          <span>랑테라피</span>
        </Link>
        <details className="menu-details">
          <summary className="icon-button" aria-label="전체 메뉴 열기">
            <span /><span /><span />
          </summary>
          <nav className="menu-drawer" aria-label="전체 메뉴">
            <div className="drawer-head"><strong>랑테라피 메뉴</strong><span aria-hidden="true">×</span></div>
            <div className="drawer-links">
              <Link href="/">홈</Link>
              {NAV.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
              <a href={PHONE_HREF}>전화상담</a>
            </div>
          </nav>
        </details>
      </div>
      <RegionSearch className="search-bar" />
    </header>
  );
}
