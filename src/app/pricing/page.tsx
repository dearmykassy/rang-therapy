import type { Metadata } from "next";
import Link from "next/link";
import { PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { COURSE_GROUPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/pricing/",
  "랑테라피 가격 안내 | 코스 시간·요금표",
  "랑테라피의 타이·아로마·힐링·스페셜·남성전용 코스별 이용 시간과 가격, 현장 후불 및 카드 결제 기준을 안내합니다.",
  ["랑테라피 가격", "출장마사지 가격", "출장마사지 코스", "현장 후불"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function PricingPage() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">COURSE &amp; PRICE</p>
        <h1>코스별 시간과<br />가격 안내</h1>
        <p>원하는 관리 방식과 이용 시간을 비교한 뒤, 서비스 주소와 희망 시각을 함께 전화상담으로 확인해 주세요.</p>
      </header>

      <section className="content-section" aria-labelledby="course-price-title">
        <div className="section-heading">
          <div><span className="section-label">PRICE TABLE</span><h2 id="course-price-title">랑 코스 시간·요금표</h2></div>
          <Link href="/guide/">이용 순서</Link>
        </div>
        <div className="full-price-grid">
          {COURSE_GROUPS.map((group, index) => (
            <article className="full-price-card" key={group.course}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><h3>{group.course}</h3></header>
              <ul>
                {group.options.map((option) => <li key={option.minutes}><b>{option.minutes}분</b><strong>{option.price}</strong></li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section compact-note" aria-label="결제 안내">
        <span className="section-label">PAYMENT</span>
        <h2>선입금 없이, 이용 뒤 현장에서 결제합니다.</h2>
        <p>사전 예약금 없이 이용이 끝난 뒤 현장에서 결제하며, 현장 카드 결제도 가능합니다. 실제 가능 일정은 서비스 주소와 희망 시각을 기준으로 확인합니다.</p>
        <div className="inline-actions"><Link href="/areas/">랑테라피 운영 지역</Link><a href={PHONE_HREF}>전화상담</a></div>
      </section>
    </main>
  );
}
