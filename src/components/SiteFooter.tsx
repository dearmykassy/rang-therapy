import Link from "@/components/SiteLink";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2>랑테라피 전화상담</h2>
          <a className="footer-phone" href={PHONE_HREF}>{PHONE_DISPLAY}</a>
          <p>서비스 주소와 희망 시각, 코스를 준비한 뒤 전화로 가능 여부를 확인해 주세요.</p>
        </div>
        <div>
          <h2>바로가기</h2>
          <Link href="/areas/">지역 안내</Link>
          <Link href="/pricing/">가격 안내</Link>
          <Link href="/guide/">이용 안내</Link>
          <Link href="/notice/">공지사항</Link>
          <Link href="/blog/">블로그</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <Link className="footer-brand" href="/" aria-label="랑테라피 홈">
          <img src="/rang-therapy-mark.svg" alt="" width="30" height="30" aria-hidden="true" />
          <strong>RANG THERAPY</strong>
        </Link>
        <p>24시간 전화상담 · 선입금 없는 현장 후불 · 현장 카드 결제</p>
        <p>지역별 가능 여부와 실제 일정은 전화상담에서 확인합니다.</p>
      </div>
    </footer>
  );
}
