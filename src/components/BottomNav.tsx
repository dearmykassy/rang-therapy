import Link from "next/link";
import { PHONE_HREF } from "@/lib/business";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="빠른 메뉴">
      <Link href="/areas/"><span aria-hidden="true">⌖</span><small>지역</small></Link>
      <Link href="/pricing/"><span aria-hidden="true">₩</span><small>가격</small></Link>
      <Link className="home-action" href="/" aria-label="랑테라피 홈"><span aria-hidden="true"><img src="/rang-therapy-mark.svg" alt="" width="42" height="42" /></span></Link>
      <Link href="/blog/"><span aria-hidden="true">▤</span><small>블로그</small></Link>
      <a href={PHONE_HREF}><span aria-hidden="true">☎</span><small>상담</small></a>
    </nav>
  );
}
